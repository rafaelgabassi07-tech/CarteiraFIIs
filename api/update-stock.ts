
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

// --- CONFIGURAÇÃO AXIOS ---
const httpsAgent = new https.Agent({ 
    keepAlive: true,
    rejectUnauthorized: false
});

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
];

const getRandomAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

async function fetchHTML(url: string, referer: string) {
    for (let i = 0; i < 2; i++) {
        try {
            const response = await axios.get(url, {
                httpsAgent,
                headers: {
                    'User-Agent': getRandomAgent(),
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Referer': referer,
                    'Upgrade-Insecure-Requests': '1',
                    'Cache-Control': 'no-cache'
                },
                timeout: 15000 
            });
            return response.data;
        } catch (e: any) {
            if (e.response?.status === 404) throw e; 
            if (i === 1) throw e;
            await new Promise(r => setTimeout(r, 2500));
        }
    }
}

// --- HELPERS DE PARSING ---

function parseValue(valueStr: any): number {
    if (!valueStr) return 0;
    if (typeof valueStr === 'number') return valueStr;
    
    let str = String(valueStr).trim();
    if (!str || str === '-' || str === 'N/A' || str === '--') return 0;

    try {
        const isNegative = str.startsWith('-');
        // Remove símbolos de moeda e %
        str = str.replace(/[R$%\s]/g, '');
        
        // Remove pontos de milhar e substitui vírgula decimal
        if (str.includes(',') && str.includes('.')) {
             str = str.replace(/\./g, '').replace(',', '.');
        } else if (str.includes(',')) {
             str = str.replace(',', '.');
        }

        const num = parseFloat(str);
        if (isNaN(num)) return 0;
        return isNegative && num > 0 ? -num : num;
    } catch { return 0; }
}

function normalizeKey(str: string) {
    if (!str) return '';
    return str.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
        .replace(/[^a-z0-9]/g, "") 
        .trim();
}

const parseToISODate = (val: any): string | null => {
    if (!val) return null;
    const str = String(val).trim();
    if (str === '-' || str === '' || str.toLowerCase() === 'n/a') return null;
    
    // Formato DD/MM/YYYY
    const matchBR = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (matchBR) {
        const day = matchBR[1].padStart(2, '0');
        const month = matchBR[2].padStart(2, '0');
        const year = matchBR[3];
        return `${year}-${month}-${day}`;
    }
    
    // Formato YYYY-MM-DD
    const matchISO = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (matchISO) {
        return str;
    }

    return null;
}

const KEY_MAP: Record<string, string> = {
    // Cotação e Valuation
    'cotacao': 'cotacao_atual', 'valoratual': 'cotacao_atual', 'preco': 'cotacao_atual',
    'pvp': 'pvp', 'vp': 'pvp', 'psobrevp': 'pvp',
    'pl': 'pl', 'psorel': 'pl', 'precolucro': 'pl',
    'dy': 'dy', 'dividendyield': 'dy', 'dy12m': 'dy',
    'vpa': 'vp_cota', 'vpporcota': 'vp_cota', 'valorpatrimonialporcota': 'vp_cota', 'valpatrimonial': 'vp_cota',
    'lpa': 'lpa', 'lucroporacao': 'lpa',
    'evebitda': 'ev_ebitda',
    'dividaliquidaebitda': 'divida_liquida_ebitda',
    
    // Rentabilidade e Margens
    'roe': 'roe',
    'margemliquida': 'margem_liquida',
    'margembruta': 'margem_bruta',
    'cagrreceita5anos': 'cagr_receita_5a', 
    'cagrlucros5anos': 'cagr_lucros_5a',
    'ultimorendimento': 'ultimo_rendimento', 'rendimento': 'ultimo_rendimento',
    
    // FIIs Específico
    'vacanciafisica': 'vacancia', 'vacancia': 'vacancia',
    'patrimonioliquido': 'patrimonio_liquido', 'patrimonio': 'patrimonio_liquido',
    'valordemercado': 'val_mercado',
    'taxadeadministracao': 'taxa_adm',
    'segmento': 'segmento',
    'tipodegestao': 'tipo_gestao', 'gestao': 'tipo_gestao',
    'liquidezmediadiaria': 'liquidez', 'liquidez': 'liquidez', 'liquidezdiaria': 'liquidez',
    'numerodecotistas': 'num_cotistas', 'cotistas': 'num_cotistas'
};

// ---------------------------------------------------------
// SCRAPER ENGINE
// ---------------------------------------------------------

async function scrapeInvestidor10(ticker: string) {
    try {
        const isFII = ticker.endsWith('11') || ticker.endsWith('11B');
        const strategies = isFII 
            ? [`/fiis/${ticker.toLowerCase()}/`, `/acoes/${ticker.toLowerCase()}/`]
            : [`/acoes/${ticker.toLowerCase()}/`, `/fiis/${ticker.toLowerCase()}/`, `/bdrs/${ticker.toLowerCase()}/`];

        let html = null;
        let finalType = isFII ? 'FII' : 'ACAO';

        for (const path of strategies) {
            try {
                html = await fetchHTML(`https://investidor10.com.br${path}`, 'https://investidor10.com.br');
                if (path.includes('fiis')) finalType = 'FII';
                else if (path.includes('bdrs')) finalType = 'BDR';
                else finalType = 'ACAO';
                break;
            } catch (e) { /* continue */ }
        }

        if (!html) throw new Error('Página não encontrada');

        const $ = cheerio.load(html);
        const extracted: any = {};

        // 1. Extração Estruturada (Cards Principais)
        // Busca cards do topo (Cotação, DY, P/VP, Liquidez, etc)
        $('div._card').each((_, card) => {
            const header = $(card).find('div._card-header span').text().trim() || $(card).find('div._card-header').text().trim();
            const value = $(card).find('div._card-body span').text().trim() || $(card).find('div._card-body').text().trim();
            
            if (header && value) {
                const key = normalizeKey(header);
                if (KEY_MAP[key]) extracted[KEY_MAP[key]] = value;
            }
        });

        // 2. Extração de Tabela de Indicadores (Muitos dados de ações ficam aqui)
        $('#table-indicators .cell').each((_, cell) => {
            const name = $(cell).find('.name').text().trim();
            const value = $(cell).find('.value span').text().trim() || $(cell).find('.value').text().trim();
            
            if (name && value) {
                const key = normalizeKey(name);
                if (KEY_MAP[key]) extracted[KEY_MAP[key]] = value;
            }
        });

        // 3. Extração Específica para FIIs (Bloco de Informações Básicas)
        // Vacância, Segmento e Gestão costumam estar em cards laterais ou tabelas de "Informações Básicas"
        $('#table-basic-data tr').each((_, tr) => {
             const label = $(tr).find('td').first().text().trim();
             const val = $(tr).find('td').last().text().trim();
             if (label && val) {
                 const key = normalizeKey(label);
                 if (KEY_MAP[key]) extracted[KEY_MAP[key]] = val;
             }
        });
        
        // Fallback genérico para cards que não foram pegos acima
        // Ex: Vacância Física as vezes está solta
        if (!extracted.vacancia && finalType === 'FII') {
             $('div.data-item').each((_, item) => {
                 const label = $(item).find('.label').text().trim();
                 const val = $(item).find('.data').text().trim();
                 const key = normalizeKey(label);
                 if (key.includes('vacancia')) extracted['vacancia'] = val;
             });
        }

        // 4. Extração de Segmento Robusta (Breadcrumbs)
        let segmento = '';
        $('#breadcrumbs li span a span, .breadcrumb-item').each((_, el) => {
            const txt = $(el).text().trim();
            if (txt && !['Início', 'Ações', 'FIIs', 'Home', 'BDRs'].includes(txt) && txt.toUpperCase() !== ticker) segmento = txt;
        });
        if (segmento) extracted['segmento'] = segmento;

        // Garante cotação se falhou no card
        if (!extracted.cotacao_atual) {
            extracted.cotacao_atual = $('div._card.cotacao div._card-body span').text() || $('.quotation-ticker').text();
        }

        // 5. Extração de Dividendos (TABELA HISTÓRICA COMPLETA)
        const dividends: any[] = [];
        const tableSelector = '#table-dividends-history'; // ID padrão do I10
        
        // Se a tabela específica existir, usa ela
        if ($(tableSelector).length > 0) {
            const rows = $(tableSelector).find('tbody tr');
            rows.each((_, tr) => {
                const cols = $(tr).find('td');
                if (cols.length >= 4) {
                    const typeRaw = $(cols[0]).text().trim().toLowerCase();
                    const dateComRaw = $(cols[1]).text().trim();
                    const datePayRaw = $(cols[2]).text().trim();
                    const valRaw = $(cols[3]).text().trim();

                    const dateCom = parseToISODate(dateComRaw);
                    const datePay = parseToISODate(datePayRaw);
                    const val = parseValue(valRaw);

                    if (dateCom && val > 0) {
                        let type = 'DIV';
                        if (typeRaw.includes('juros') || typeRaw.includes('jcp')) type = 'JCP';
                        else if (typeRaw.includes('rend')) type = 'REND';
                        else if (typeRaw.includes('amort')) type = 'AMORT';

                        dividends.push({
                            ticker: ticker.toUpperCase(),
                            type,
                            date_com: dateCom,
                            payment_date: datePay || null,
                            rate: val
                        });
                    }
                }
            });
        } else {
            // Fallback: Procura qualquer tabela com headers compatíveis
            $('table').each((_, table) => {
                const headers = $(table).find('thead th').text().toLowerCase();
                if (headers.includes('tipo') && headers.includes('data com') && headers.includes('valor')) {
                    $(table).find('tbody tr').each((_, tr) => {
                        const tds = $(tr).find('td');
                        if (tds.length >= 3) {
                             const typeRaw = $(tds[0]).text().trim();
                             const dateComRaw = $(tds[1]).text().trim();
                             const datePayRaw = $(tds[2]).text().trim();
                             const valRaw = $(tds[3] || tds[2]).text().trim(); // Adjust column index heuristic

                             const dateCom = parseToISODate(dateComRaw);
                             const val = parseValue(valRaw);
                             
                             if (dateCom && val > 0) {
                                 dividends.push({
                                    ticker: ticker.toUpperCase(),
                                    type: 'DIV', // Default fallback
                                    date_com: dateCom,
                                    payment_date: parseToISODate(datePayRaw),
                                    rate: val
                                });
                             }
                        }
                    });
                }
            });
        }

        return {
            metadata: {
                ticker: ticker.toUpperCase(),
                type: finalType,
                segmento: extracted.segmento || 'Geral',
                updated_at: new Date().toISOString(),
                cotacao_atual: parseValue(extracted.cotacao_atual),
                dy: parseValue(extracted.dy),
                pvp: parseValue(extracted.pvp),
                pl: parseValue(extracted.pl),
                roe: parseValue(extracted.roe),
                vp_cota: parseValue(extracted.vp_cota),
                lpa: parseValue(extracted.lpa),
                vacancia: parseValue(extracted.vacancia),
                ultimo_rendimento: parseValue(extracted.ultimo_rendimento),
                margem_liquida: parseValue(extracted.margem_liquida),
                margem_bruta: parseValue(extracted.margem_bruta),
                divida_liquida_ebitda: parseValue(extracted.divida_liquida_ebitda),
                ev_ebitda: parseValue(extracted.ev_ebitda),
                cagr_receita_5a: parseValue(extracted.cagr_receita_5a),
                cagr_lucros_5a: parseValue(extracted.cagr_lucros_5a),
                // Strings preservadas
                liquidez: extracted.liquidez || 'N/A',
                val_mercado: extracted.val_mercado || 'N/A',
                tipo_gestao: extracted.tipo_gestao || 'N/A',
                taxa_adm: extracted.taxa_adm || 'N/A',
                patrimonio_liquido: extracted.patrimonio_liquido || 'N/A',
                num_cotistas: extracted.num_cotistas || 'N/A'
            },
            dividends: dividends
        };

    } catch (e: any) {
        console.error(`Erro Scraping ${ticker}: ${e.message}`);
        return null;
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const ticker = String(req.query.ticker || '').trim().toUpperCase();
    if (!ticker) return res.status(400).json({ error: 'Ticker required' });

    try {
        const inv10Data = await scrapeInvestidor10(ticker);
        
        if (!inv10Data || !inv10Data.metadata) {
            return res.status(404).json({ success: false, error: 'Dados não encontrados no Investidor10.' });
        }

        const metadata = inv10Data.metadata;
        const dividends = inv10Data.dividends || [];

        // Deduplicação inteligente de dividendos
        const uniqueMap = new Map();
        dividends.forEach(d => {
            const key = `${d.type}|${d.date_com}|${d.rate.toFixed(4)}`; 
            const existing = uniqueMap.get(key);
            if (!existing) {
                uniqueMap.set(key, d);
            } else if (!existing.payment_date && d.payment_date) {
                uniqueMap.set(key, d);
            }
        });
        const cleanDividends = Array.from(uniqueMap.values());

        if (metadata) {
            const dbPayload = {
                ticker: metadata.ticker,
                type: metadata.type,
                segment: metadata.segmento,
                pvp: metadata.pvp,
                pl: metadata.pl,
                dy_12m: metadata.dy,
                roe: metadata.roe,
                vacancia: metadata.vacancia,
                liquidez: metadata.liquidez,
                valor_mercado: metadata.val_mercado,
                updated_at: metadata.updated_at,
                lpa: metadata.lpa,
                vpa: metadata.vp_cota, 
                vp_cota: metadata.vp_cota,
                margem_liquida: metadata.margem_liquida,
                margem_bruta: metadata.margem_bruta,
                divida_liquida_ebitda: metadata.divida_liquida_ebitda,
                ev_ebitda: metadata.ev_ebitda,
                cagr_receita: metadata.cagr_receita_5a,
                cagr_lucro: metadata.cagr_lucros_5a,
                tipo_gestao: metadata.tipo_gestao,
                patrimonio_liquido: metadata.patrimonio_liquido,
                taxa_adm: metadata.taxa_adm,
                ultimo_rendimento: metadata.ultimo_rendimento
            };
            // Remove undefined
            Object.keys(dbPayload).forEach(key => (dbPayload as any)[key] === undefined && delete (dbPayload as any)[key]);
            
            await supabase.from('ativos_metadata').upsert(dbPayload, { onConflict: 'ticker' });
        }

        if (cleanDividends.length > 0) {
             const divPayload = cleanDividends.map(d => ({
                 ticker: d.ticker,
                 type: d.type,
                 date_com: d.date_com,
                 payment_date: d.payment_date || '2099-12-31', 
                 rate: d.rate
             }));

             // Atualiza datas de pagamento futuras se agora tiverem data real
             const datesWithRealPayment = divPayload
                .filter(d => d.payment_date !== '2099-12-31')
                .map(d => d.date_com);

             if (datesWithRealPayment.length > 0) {
                 await supabase.from('market_dividends')
                    .delete()
                    .eq('ticker', ticker) 
                    .eq('payment_date', '2099-12-31')
                    .in('date_com', datesWithRealPayment); 
             }

             await supabase.from('market_dividends').upsert(divPayload, { 
                onConflict: 'ticker, type, date_com, payment_date, rate', 
                ignoreDuplicates: true 
            });
        }

        return res.status(200).json({ success: true, data: metadata, dividends: cleanDividends });

    } catch (e: any) {
        console.error(`Erro Handler ${ticker}:`, e);
        return res.status(500).json({ success: false, error: e.message });
    }
}
