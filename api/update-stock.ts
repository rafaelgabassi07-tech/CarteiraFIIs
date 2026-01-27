
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Upgrade-Insecure-Requests': '1'
    },
    timeout: 15000,
    maxRedirects: 5
});

// --- HELPERS DE PARSEAMENTO ---
const REGEX_NORMALIZE = /[\u0300-\u036f]/g;

function normalize(str: string) {
    if (!str) return '';
    return str.normalize("NFD").replace(REGEX_NORMALIZE, "").toLowerCase().trim();
}

function parseValue(valueStr: any) {
    if (!valueStr) return 0;
    try {
        if (typeof valueStr === 'number') return valueStr;
        
        let str = String(valueStr).trim();
        // Remove R$ e %
        str = str.replace('R$', '').replace('%', '').trim();
        
        // Se for hifen ou vazio, retorna 0
        if (!str || str === '-') return 0;

        // Remove tudo que não é número, vírgula, ponto ou hífen
        const clean = str.replace(/[^0-9,.-]+/g, ""); 
        
        if (!clean) return 0;

        const hasComma = clean.includes(',');
        const hasDot = clean.includes('.');

        // 1.000,00 (Formato BR Padrão)
        if (hasComma && !hasDot) {
             return parseFloat(clean.replace(',', '.')) || 0;
        }
        
        // 1.000 (Sem decimais ou US?)
        if (!hasComma && hasDot) {
             // Heurística: Se tem ponto e o valor resultante é pequeno (ex: < 100), provavelmente é decimal US (ex: 10.5)
             // Se é grande, é milhar BR (ex: 1.000)
             // Mas como estamos no BR, assume milhar por padrão, exceto se parecer muito um índice pequeno.
             // Vamos remover o ponto para segurança (1.000 -> 1000).
             return parseFloat(clean.replace(/\./g, '')) || 0;
        }

        // 1.000,50 (Misto)
        if (hasComma && hasDot) {
             if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
                 return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
             } else {
                 return parseFloat(clean.replace(/,/g, '')) || 0;
             }
        }
        
        // Apenas números (e.g. "15" ou "10,5" se passou direto)
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
    
    // URLs potenciais
    const urlFii = `https://investidor10.com.br/fiis/${tickerLower}/`;
    const urlAcao = `https://investidor10.com.br/acoes/${tickerLower}/`;
    const urlBdr = `https://investidor10.com.br/bdrs/${tickerLower}/`;

    // Ordem de tentativa baseada no sufixo
    const urls = isLikelyFii ? [urlFii, urlAcao, urlBdr] : [urlAcao, urlFii, urlBdr];

    for (const url of urls) {
        try {
            const res = await client.get(url);
            let type = 'ACAO';
            if (url.includes('/fiis/')) type = 'FII';
            else if (url.includes('/bdrs/')) type = 'BDR';
            return { data: res.data, type };
        } catch (e: any) {
            if (e.response && e.response.status === 404) continue;
            throw e;
        }
    }
    throw new Error('Asset not found');
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
            segmento: null,
            // Campos Específicos Ações
            roe: null, margem_liquida: null, margem_bruta: null,
            cagr_receita_5a: null, cagr_lucros_5a: null,
            divida_liquida_ebitda: null, ev_ebitda: null,
            lpa: null, vp_cota: null,
            // Campos Específicos FIIs
            vacancia: null, ultimo_rendimento: null, num_cotistas: null, patrimonio_liquido: null
        };

        // Função universal de processamento de pares Chave/Valor
        const processPair = (tituloRaw: string, valorRaw: string) => {
            const titulo = normalize(tituloRaw);
            const tituloClean = titulo.replace(/[^a-z0-9]/g, ''); 
            
            const valor = valorRaw ? valorRaw.trim() : '';
            if (!valor || valor === '-') return;

            // --- DY (Dividend Yield) ---
            if (dados.dy === null && (tituloClean === 'dy' || tituloClean === 'dividendyield' || titulo.includes('dividend'))) {
                dados.dy = parseValue(valor);
            }

            // --- P/VP ---
            if (dados.pvp === null && (tituloClean === 'pvp' || titulo === 'p/vp')) {
                dados.pvp = parseValue(valor);
            }
            
            // --- VPA / VP (Valor Patrimonial por Ação/Cota) ---
            if (dados.vp_cota === null) {
                if (tituloClean === 'vpa' || tituloClean === 'vp' || tituloClean === 'valorpatrimonialcota') {
                    dados.vp_cota = parseValue(valor);
                } else if (titulo.includes('patrimonial') && titulo.includes('cota')) {
                    dados.vp_cota = parseValue(valor);
                }
            }
            // Fallback Genérico para "Valor Patrimonial" (pode ser total ou cota)
            if (titulo === 'valor patrimonial' && dados.vp_cota === null) {
                 const v = parseValue(valor);
                 // Heurística: Se < 10000, assume que é por cota. Se maior, é patrimônio total.
                 if (v < 10000) dados.vp_cota = v;
                 else dados.patrimonio_liquido = valor;
            }

            // --- P/L ---
            if (dados.pl === null && (tituloClean === 'pl' || titulo.includes('p/l'))) {
                dados.pl = parseValue(valor);
            }
            
            // --- GERAIS ---
            if (dados.liquidez === null && titulo.includes('liquidez')) dados.liquidez = valor; 
            if (dados.segmento === null && titulo.includes('segmento')) dados.segmento = valor;
            
            if (titulo.includes('mercado') && titulo.includes('valor')) dados.val_mercado = valor;
            // Se já não pegou patrimônio total acima
            if (!dados.patrimonio_liquido && titulo.includes('patrimonio') && titulo.includes('liquido')) dados.patrimonio_liquido = valor;

            // --- FIIs ---
            if (titulo.includes('vacancia')) dados.vacancia = parseValue(valor);
            if (titulo.includes('ultimo rendimento')) dados.ultimo_rendimento = parseValue(valor);
            if (tituloClean.includes('cotistas')) dados.num_cotistas = parseValue(valor);

            // --- AÇÕES ---
            if (tituloClean === 'roe' || titulo.includes('roe')) dados.roe = parseValue(valor);
            if (titulo.includes('margem liquida')) dados.margem_liquida = parseValue(valor);
            if (titulo.includes('margem bruta')) dados.margem_bruta = parseValue(valor);

            if (tituloClean.includes('ebitda')) {
                if (tituloClean.includes('div') && tituloClean.includes('liq')) dados.divida_liquida_ebitda = parseValue(valor);
                else if (tituloClean.includes('ev')) dados.ev_ebitda = parseValue(valor);
            }
            
            if (titulo.includes('cagr')) {
                if (titulo.includes('receita')) dados.cagr_receita_5a = parseValue(valor);
                if (titulo.includes('lucro')) dados.cagr_lucros_5a = parseValue(valor);
            }

            if (tituloClean === 'lpa' || titulo.includes('lpa')) dados.lpa = parseValue(valor);
        };

        // ESTRATÉGIA 1: Cards do Topo (Layout Novo)
        $('div._card').each((_, el) => {
            const header = $(el).find('div._card-header').text() || $(el).find('.header').text() || $(el).find('span').first().text();
            const body = $(el).find('div._card-body').text() || $(el).find('.body').text() || $(el).find('span').last().text();
            processPair(header, body);
        });

        // ESTRATÉGIA 2: Células de Indicadores (Layout Grid)
        $('.cell, .data-item, .indicator-item').each((_, el) => {
            const label = $(el).find('.name, .label, .title').text();
            const val = $(el).find('.value, .data, .number').text();
            processPair(label, val);
        });

        // ESTRATÉGIA 3: Tabelas Genéricas
        $('table tbody tr').each((_, row) => {
            const cols = $(row).find('td');
            if (cols.length >= 2) {
                processPair($(cols[0]).text(), $(cols[1]).text());
            }
        });

        // ESTRATÉGIA 4: Listas e Indicadores Isolados (Layout Antigo/Mobile)
        // Isso recupera itens que estão em listas <ul> ou divs genéricas com ID indicators
        $('div#indicators, div.indicators, ul.indicators').find('div, li').each((_, el) => {
             const text = $(el).text();
             if (text.includes(':')) {
                 const [k, v] = text.split(':');
                 processPair(k, v);
             } else {
                 // Tenta pegar label/value por classes filhas se existirem
                 const label = $(el).find('span').first().text();
                 const val = $(el).find('span').last().text();
                 if (label && val && label !== val) processPair(label, val);
             }
        });

        // Cotação Atual (Destaque)
        const cotacaoEl = $('div._card').filter((i, el) => {
            const t = normalize($(el).text());
            return t.includes('cotacao') || t.includes('valor atual');
        }).first();
        if (cotacaoEl.length) {
            dados.cotacao_atual = parseValue(cotacaoEl.find('div._card-body').text());
        }

        // Segmento (Breadcrumbs)
        if (!dados.segmento) {
            $('#breadcrumbs li, .breadcrumbs span, .breadcrumb-item').each((_, el) => {
                const t = $(el).text().trim();
                if (t && !['Início', 'Home', 'Ações', 'FIIs', 'Fundos', 'BDRs'].includes(t) && t.toUpperCase() !== ticker) {
                    dados.segmento = t;
                }
            });
        }

        // Extração de Dividendos
        const dividends: any[] = [];
        let tableRows = $('#table-dividends-history tbody tr');
        
        if (tableRows.length === 0) {
            $('table').each((_, tbl) => {
                const h = normalize($(tbl).text());
                if (h.includes('com') && h.includes('pagamento') && (h.includes('valor') || h.includes('liquido') || h.includes('provento'))) {
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

        // Garante VPA
        if (dados.vp_cota !== null && dados.vpa === undefined) {
            dados.vpa = dados.vp_cota;
        }

        const finalMetadata = {
            ...dados,
            dy_12m: dados.dy, 
            current_price: dados.cotacao_atual,
        };

        // Remove nulos/undefined, mas MANTÉM zeros (0)
        Object.keys(finalMetadata).forEach(key => {
            if (finalMetadata[key] === null || finalMetadata[key] === undefined || finalMetadata[key] === '') delete finalMetadata[key];
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
        if (!force) {
            const { data: existing } = await supabase
                .from('ativos_metadata')
                .select('*')
                .eq('ticker', ticker)
                .single();
            
            if (existing && existing.updated_at) {
                const age = Date.now() - new Date(existing.updated_at).getTime();
                if (age < 10800000) { 
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

        if (metadata) {
            const dbPayload = { ...metadata };
            delete dbPayload.dy;
            delete dbPayload.cotacao_atual;
            // Garante que salve vp_cota se o banco esperar essa coluna
            if (dbPayload.vpa && !dbPayload.vp_cota) dbPayload.vp_cota = dbPayload.vpa;
            
            await supabase.from('ativos_metadata').upsert(dbPayload, { onConflict: 'ticker' });
        }

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
