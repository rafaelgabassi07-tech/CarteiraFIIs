
// @ts-nocheck
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURAÇÃO SUPABASE ---
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

// --- CACHE TTL ---
const getTTL = () => {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const isMarketOpen = day >= 1 && day <= 5 && hour >= 10 && hour < 18;
    return isMarketOpen ? 20 * 60 * 1000 : 4 * 60 * 60 * 1000;
};

// --- AGENTE HTTPS & CLIENT ---
const httpsAgent = new https.Agent({ 
    keepAlive: true,
    maxSockets: 100,
    maxFreeSockets: 10,
    timeout: 10000,
    rejectUnauthorized: false
});

const client = axios.create({
    httpsAgent,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br'
    },
    timeout: 9000
});

// --- HELPERS (Baseados no Script Fornecido) ---

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
        const clean = String(valueStr).replace(REGEX_CLEAN_NUMBER, "").replace(',', '.');
        return parseFloat(clean) || 0;
    } catch (e) { return 0; }
}

function parseExtendedValue(str: string) {
    if (!str) return 0;
    const val = parseValue(str);
    const lower = str.toLowerCase();
    if (lower.includes('bilh')) return val * 1000000000;
    if (lower.includes('milh')) return val * 1000000;
    if (lower.includes('mil')) return val * 1000;
    return val;
}

function formatCurrency(value: number) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseDate(dateStr: string) {
    if (!dateStr || dateStr === '-' || dateStr.length < 10) return null;
    try {
        const parts = dateStr.trim().split('/');
        if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
        return null;
    } catch { return null; }
}

async function fetchHtmlWithRetry(ticker: string) {
    const tickerLower = ticker.toLowerCase();
    // Prioriza FII se terminar com 11/11B, senão Ações. Mas o retry garante cobertura.
    const isLikelyFii = ticker.endsWith('11') || ticker.endsWith('11B');
    const firstUrl = isLikelyFii 
        ? `https://investidor10.com.br/fiis/${tickerLower}/`
        : `https://investidor10.com.br/acoes/${tickerLower}/`;
    
    try {
        const res = await client.get(firstUrl);
        return { data: res.data, type: isLikelyFii ? 'FII' : 'ACAO' };
    } catch (e: any) {
        if (e.response && e.response.status === 404) {
            // Inverte o tipo
            const fallbackUrl = isLikelyFii 
                ? `https://investidor10.com.br/acoes/${tickerLower}/`
                : `https://investidor10.com.br/fiis/${tickerLower}/`;
            const res = await client.get(fallbackUrl);
            return { data: res.data, type: isLikelyFii ? 'ACAO' : 'FII' };
        }
        throw e;
    }
}

// --- SCRAPER PRINCIPAL ---

async function scrapeInvestidor10(ticker: string) {
    try {
        const { data: html, type: finalType } = await fetchHtmlWithRetry(ticker);
        const $ = cheerio.load(html);

        // Estrutura de dados inicial compatível com o frontend
        const dados: any = {
            ticker: ticker.toUpperCase(),
            type: finalType,
            updated_at: new Date().toISOString(),
            dy: 0, pvp: 0, pl: 0, 
            liquidez: 'N/A', val_mercado: 'N/A',
            segmento: 'Geral'
        };

        // --- 1. Extração Genérica (Cards e Tabelas) ---
        const processPair = (tituloRaw: string, valorRaw: string) => {
            const titulo = normalize(tituloRaw);
            const valor = valorRaw.trim();
            if (!valor) return;

            // Mapeamento para chaves do DB
            if (titulo.includes('dividend yield') || titulo === 'dy') dados.dy = parseValue(valor);
            else if (titulo.includes('p/vp') || titulo === 'pvp') dados.pvp = parseValue(valor);
            else if (titulo.includes('p/l') || titulo === 'pl') dados.pl = parseValue(valor);
            else if (titulo.includes('liquidez')) dados.liquidez = valor;
            else if (titulo.includes('segmento')) dados.segmento = valor;
            else if (titulo.includes('vacancia')) dados.vacancia = parseValue(valor);
            else if (titulo.includes('valor de mercado') || titulo.includes('val. mercado')) dados.val_mercado = valor;
            else if (titulo.includes('ultimo rendimento')) dados.ultimo_rendimento = parseValue(valor);
            else if (titulo.includes('cotacao')) dados.cotacao_atual = parseValue(valor);
            else if (titulo.includes('num. cotistas') || titulo.includes('cotistas')) dados.num_cotistas = parseValue(valor);
            else if (titulo.includes('patrimonio liquido')) dados.patrimonio_liquido = valor;
            else if (titulo.includes('roe')) dados.roe = parseValue(valor);
            
            // Ações Específicos
            else if (titulo.includes('margem liquida')) dados.margem_liquida = parseValue(valor);
            else if (titulo.includes('margem bruta')) dados.margem_bruta = parseValue(valor);
            else if (titulo.includes('div. liquida / ebitda')) dados.divida_liquida_ebitda = parseValue(valor);
            else if (titulo.includes('ev / ebitda')) dados.ev_ebitda = parseValue(valor);
            else if (titulo.includes('cagr receitas')) dados.cagr_receita_5a = parseValue(valor);
            else if (titulo.includes('cagr lucros')) dados.cagr_lucros_5a = parseValue(valor);
            else if (titulo.includes('lpa')) dados.lpa = parseValue(valor);
            else if (titulo.includes('vpa')) dados.vp_cota = parseValue(valor);
        };

        // Extração por Cards (Novo Layout Investidor10)
        $('div._card').each((_, el) => {
            const header = $(el).find('div._card-header, div.header').first().text() || $(el).find('span').first().text();
            const body = $(el).find('div._card-body, div.body').first().text() || $(el).find('span').last().text();
            processPair(header, body);
        });

        // Extração por Tabelas (Cell)
        $('.cell').each((_, el) => {
            processPair($(el).find('.name').text(), $(el).find('.value').text());
        });

        // Fallback: Tabela Clássica
        $('table tbody tr').each((_, row) => {
            const cols = $(row).find('td');
            if (cols.length >= 2) processPair($(cols[0]).text(), $(cols[1]).text());
        });

        // Refinamento de Segmento (Breadcrumbs)
        if (!dados.segmento || dados.segmento === 'Geral') {
            $('#breadcrumbs li, .breadcrumbs span').each((_, el) => {
                const t = $(el).text().trim();
                if (t && !['Início', 'Home', 'Ações', 'FIIs', 'Fundos', 'BDRs'].includes(t) && t.toUpperCase() !== ticker) {
                    dados.segmento = t;
                }
            });
        }

        // --- 2. Extração de Dividendos ---
        const dividends: any[] = [];
        let tableRows = $('#table-dividends-history tbody tr');
        
        // Fallback se o ID mudar
        if (tableRows.length === 0) {
            $('table').each((_, tbl) => {
                const h = normalize($(tbl).text());
                if (h.includes('com') && h.includes('pagamento') && h.includes('valor')) {
                    tableRows = $(tbl).find('tbody tr');
                    return false;
                }
            });
        }

        tableRows.each((_, el) => {
            const cols = $(el).find('td');
            // Formato comum: [Tipo, Data Com, Data Pag, Valor] ou [Data Com, Data Pag, Valor]
            if (cols.length >= 3) {
                let type = 'DIV';
                let dateComStr, datePayStr, valStr;

                if (cols.length >= 4) {
                    const tText = normalize($(cols[0]).text());
                    if (tText.includes('jcp')) type = 'JCP';
                    else if (tText.includes('rend')) type = 'REND';
                    
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

        // Limpeza final para o Frontend
        dados.dy_12m = dados.dy; // Alias
        dados.current_price = dados.cotacao_atual;

        return { metadata: dados, dividends };

    } catch (e: any) {
        console.error(`[SCRAPER ERROR] ${ticker}: ${e.message}`);
        return null;
    }
}

// HANDLER DA API
export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const ticker = String(req.query.ticker || '').trim().toUpperCase();
    const force = req.query.force === 'true'; 
    
    if (!ticker) return res.status(400).json({ error: 'Ticker required' });

    try {
        if (!force) {
            const { data: existing } = await supabase
                .from('ativos_metadata')
                .select('updated_at')
                .eq('ticker', ticker)
                .single();
            
            if (existing && existing.updated_at) {
                const lastUpdate = new Date(existing.updated_at).getTime();
                const now = Date.now();
                if (now - lastUpdate < getTTL()) {
                    return res.status(200).json({ success: true, cached: true });
                }
            }
        }

        const result = await scrapeInvestidor10(ticker);
        
        if (!result) {
            return res.status(404).json({ success: false, error: 'Falha na coleta de dados.' });
        }

        const { metadata, dividends } = result;

        // Salva Metadados
        if (metadata) {
            const dbPayload = { ...metadata };
            // Remove alias de frontend antes de salvar
            delete dbPayload.dy;
            delete dbPayload.cotacao_atual;
            
            // Remove campos NaN/Undefined
            Object.keys(dbPayload).forEach(key => {
                if (dbPayload[key] === undefined || (typeof dbPayload[key] === 'number' && isNaN(dbPayload[key]))) {
                    delete dbPayload[key];
                }
            });

            await supabase.from('ativos_metadata').upsert(dbPayload, { onConflict: 'ticker' });
        }

        // Salva Dividendos (Upsert seguro)
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
