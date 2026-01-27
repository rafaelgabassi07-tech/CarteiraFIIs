
// @ts-nocheck
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

const httpsAgent = new https.Agent({ 
    keepAlive: true,
    maxSockets: 100,
    maxFreeSockets: 10,
    timeout: 15000,
    rejectUnauthorized: false
});

const client = axios.create({
    httpsAgent,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache'
    },
    timeout: 15000,
    maxRedirects: 5
});

// --- HELPERS (Baseado no script fornecido) ---
const REGEX_CLEAN_NUMBER = /[^0-9,-]+/g;
const REGEX_NORMALIZE = /[\u0300-\u036f]/g;

function normalize(str: string) {
    if (!str) return '';
    return str.normalize("NFD").replace(REGEX_NORMALIZE, "").toLowerCase().trim();
}

function parseValue(valueStr: any) {
    if (!valueStr) return 0;
    try {
        if (typeof valueStr === 'number') return valueStr;
        const clean = String(valueStr).replace(REGEX_CLEAN_NUMBER, "").trim();
        if (!clean) return 0;
        return parseFloat(clean.replace(',', '.')) || 0;
    } catch (e) { return 0; }
}

function parseDate(dateStr: string) {
    if (!dateStr || dateStr === '-' || dateStr.length < 8) return null;
    try {
        const parts = dateStr.trim().split('/');
        if (parts.length === 3) {
            let year = parts[2];
            if (year.length === 2) year = '20' + year;
            return `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        return null;
    } catch { return null; }
}

async function fetchHtmlWithRetry(ticker: string) {
    const tickerLower = ticker.toLowerCase();
    const isLikelyFii = ticker.endsWith('11') || ticker.endsWith('11B');
    
    // Tenta URL baseada na probabilidade
    const url1 = `https://investidor10.com.br/${isLikelyFii ? 'fiis' : 'acoes'}/${tickerLower}/`;
    const url2 = `https://investidor10.com.br/${isLikelyFii ? 'acoes' : 'fiis'}/${tickerLower}/`;

    try {
        const res = await client.get(url1);
        return { data: res.data, type: isLikelyFii ? 'FII' : 'ACAO' };
    } catch (e: any) {
        if (e.response && e.response.status === 404) {
            try {
                const res2 = await client.get(url2);
                return { data: res2.data, type: isLikelyFii ? 'ACAO' : 'FII' };
            } catch (e2) {
                // Tenta BDRs como último recurso
                try {
                    const res3 = await client.get(`https://investidor10.com.br/bdrs/${tickerLower}/`);
                    return { data: res3.data, type: 'BDR' };
                } catch { throw e; }
            }
        }
        throw e;
    }
}

async function scrapeInvestidor10(ticker: string) {
    try {
        const { data: html, type: finalType } = await fetchHtmlWithRetry(ticker);
        const $ = cheerio.load(html);

        const dados: any = {
            ticker: ticker.toUpperCase(),
            type: finalType,
            updated_at: new Date().toISOString(),
            dy: null, pvp: null, pl: null, 
            liquidez: null, val_mercado: null,
            segmento: null
        };

        // --- LÓGICA DE EXTRAÇÃO BASEADA NO SCRIPT DO USUÁRIO ---
        
        const processPair = (tituloRaw: string, valorRaw: string) => {
            const titulo = normalize(tituloRaw);
            const valor = valorRaw.trim();
            if (!valor || valor === '-') return;

            // Debug Log (Opcional, removido para prod)
            
            if (dados.dy === null && (titulo.includes('dividend yield') || titulo === 'dy')) dados.dy = parseValue(valor);
            if (dados.pvp === null && (titulo.includes('p/vp') || titulo === 'vp')) dados.pvp = parseValue(valor);
            if (dados.pl === null && (titulo.includes('p/l') || titulo === 'pl')) dados.pl = parseValue(valor);
            if (dados.liquidez === null && titulo.includes('liquidez')) dados.liquidez = valor;
            if (dados.segmento === null && titulo.includes('segmento')) dados.segmento = valor;
            if (dados.vacancia === null && titulo.includes('vacancia')) dados.vacancia = parseValue(valor);
            if (dados.ultimo_rendimento === null && titulo.includes('ultimo rendimento')) dados.ultimo_rendimento = parseValue(valor);
            if (dados.roe === null && titulo.includes('roe')) dados.roe = parseValue(valor);
            
            if (titulo.includes('mercado') && titulo.includes('valor')) dados.val_mercado = valor;
            if (titulo.includes('patrimonio') && titulo.includes('liquido')) dados.patrimonio_liquido = valor;

            if (titulo.includes('margem liquida')) dados.margem_liquida = parseValue(valor);
            if (titulo.includes('margem bruta')) dados.margem_bruta = parseValue(valor);
            if (titulo.includes('ebitda')) {
                if (titulo.includes('div') && titulo.includes('liq')) dados.divida_liquida_ebitda = parseValue(valor);
                else if (titulo.includes('ev')) dados.ev_ebitda = parseValue(valor);
            }
            
            if (titulo.includes('cagr') && titulo.includes('receita')) dados.cagr_receita_5a = parseValue(valor);
            if (titulo.includes('cagr') && titulo.includes('lucro')) dados.cagr_lucros_5a = parseValue(valor);
            if (titulo.includes('lpa')) dados.lpa = parseValue(valor);
            
            if (titulo.includes('vpa') || (titulo.includes('patrimonial') && titulo.includes('cota'))) dados.vp_cota = parseValue(valor);
            if (titulo.includes('cotistas') && !titulo.includes('num')) dados.num_cotistas = parseValue(valor);
        };

        // 1. CARDS GERAIS (Novo Layout Investidor10)
        // A estrutura é geralmente ._card -> ._card-header (titulo) + ._card-body (valor)
        $('div._card').each((_, el) => {
            const header = $(el).find('div._card-header').text() || $(el).find('.header').text() || $(el).find('span').first().text();
            const body = $(el).find('div._card-body').text() || $(el).find('.body').text() || $(el).find('span').last().text();
            processPair(header, body);
        });

        // 2. COTAÇÃO ATUAL (Geralmente no topo em destaque)
        const cotacaoEl = $('div._card').filter((i, el) => {
            const t = normalize($(el).text());
            return t.includes('cotacao') || t.includes('valor atual');
        }).first();
        if (cotacaoEl.length) {
            const val = cotacaoEl.find('div._card-body').text();
            dados.cotacao_atual = parseValue(val);
        }

        // 3. TABELA DE INDICADORES (Layout Antigo/Misto)
        // Procura células com classe .cell -> .name + .value
        $('.cell').each((_, el) => {
            processPair($(el).find('.name').text(), $(el).find('.value').text());
        });

        // 4. TABELAS HTML (Fallback)
        $('table tbody tr').each((_, row) => {
            const cols = $(row).find('td');
            if (cols.length >= 2) processPair($(cols[0]).text(), $(cols[1]).text());
        });

        // 5. SEGMENTO (BREADCRUMBS)
        if (!dados.segmento) {
            $('#breadcrumbs li, .breadcrumbs span, .breadcrumb-item').each((_, el) => {
                const t = $(el).text().trim();
                if (t && !['Início', 'Home', 'Ações', 'FIIs', 'Fundos', 'BDRs'].includes(t) && t.toUpperCase() !== ticker) {
                    dados.segmento = t;
                }
            });
        }

        // 6. DIVIDENDOS
        const dividends: any[] = [];
        let tableRows = $('#table-dividends-history tbody tr');
        if (tableRows.length === 0) {
            $('table').each((_, tbl) => {
                const h = normalize($(tbl).text());
                if (h.includes('com') && h.includes('pagamento')) {
                    tableRows = $(tbl).find('tbody tr');
                    return false;
                }
            });
        }

        tableRows.each((_, el) => {
            const cols = $(el).find('td');
            if (cols.length >= 3) {
                let type = 'DIV';
                let dateComStr = '', datePayStr = '', valStr = '';

                if (cols.length >= 4) {
                    const tText = normalize($(cols[0]).text());
                    if (tText.includes('jcp')) type = 'JCP';
                    else if (tText.includes('rend')) type = 'REND';
                    else if (tText.includes('amort')) type = 'AMORT';
                    
                    dateComStr = $(cols[1]).text();
                    datePayStr = $(cols[2]).text();
                    valStr = $(cols[3]).text();
                } else {
                    dateComStr = $(cols[0]).text();
                    datePayStr = $(cols[1]).text();
                    valStr = $(cols[2]).text();
                }

                const dateCom = parseDate(dateComStr);
                const paymentDate = parseDate(datePayStr);
                const rate = parseValue(valStr);

                if (dateCom && rate > 0) {
                    dividends.push({
                        ticker: ticker.toUpperCase(),
                        type,
                        date_com: dateCom,
                        payment_date: paymentDate || null,
                        rate
                    });
                }
            }
        });

        // Limpeza e Alias
        const finalMetadata = {
            ...dados,
            dy_12m: dados.dy, 
            current_price: dados.cotacao_atual,
        };

        // Remove nulos
        Object.keys(finalMetadata).forEach(key => {
            if (finalMetadata[key] === null || finalMetadata[key] === undefined) delete finalMetadata[key];
        });

        return { metadata: finalMetadata, dividends };

    } catch (e: any) {
        console.error(`Scraper error ${ticker}: ${e.message}`);
        return null;
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const ticker = String(req.query.ticker || '').trim().toUpperCase();
    const force = req.query.force === 'true'; 
    
    if (!ticker) return res.status(400).json({ error: 'Ticker required' });

    try {
        // Cache Check
        if (!force) {
            const { data: existing } = await supabase
                .from('ativos_metadata')
                .select('*')
                .eq('ticker', ticker)
                .single();
            
            if (existing && existing.updated_at) {
                const age = Date.now() - new Date(existing.updated_at).getTime();
                if (age < 3600000) { // 1 hora
                     const { data: divs } = await supabase
                        .from('market_dividends')
                        .select('*')
                        .eq('ticker', ticker);
                    return res.status(200).json({ success: true, data: existing, dividends: divs || [], cached: true });
                }
            }
        }

        const result = await scrapeInvestidor10(ticker);
        
        if (!result) {
            return res.status(404).json({ success: false, error: 'Falha ao obter dados.' });
        }

        const { metadata, dividends } = result;

        // Persist Metadata
        if (metadata) {
            const dbPayload = { ...metadata };
            delete dbPayload.dy;
            delete dbPayload.cotacao_atual;
            await supabase.from('ativos_metadata').upsert(dbPayload, { onConflict: 'ticker' });
        }

        // Persist Dividends
        if (dividends.length > 0) {
             const uniqueDivs = Array.from(new Map(dividends.map(item => [
                `${item.type}-${item.date_com}-${item.rate}`, item
            ])).values());
            await supabase.from('market_dividends').upsert(uniqueDivs, { onConflict: 'ticker,type,date_com,rate' });
        }

        return res.status(200).json({ success: true, data: metadata, dividends });

    } catch (e: any) {
        return res.status(500).json({ success: false, error: e.message });
    }
}
