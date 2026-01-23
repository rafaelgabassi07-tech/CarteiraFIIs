
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
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0'
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
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
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
    if (!str || str === '-' || str === 'N/A' || str === '--' || str === 'null') return 0;

    try {
        // Remove caracteres invisíveis e espaços
        str = str.replace(/\s/g, '');
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

// Mapa expandido e cirúrgico
const KEY_MAP: Record<string, string> = {
    // Cotação e Valuation
    'cotacao': 'cotacao_atual', 'valoratual': 'cotacao_atual', 'preco': 'cotacao_atual',
    'pvp': 'pvp', 'vp': 'pvp', 'psobrevp': 'pvp', 'p/vp': 'pvp',
    'pl': 'pl', 'psorel': 'pl', 'precolucro': 'pl', 'p/l': 'pl',
    'dy': 'dy', 'dividendyield': 'dy', 'dy12m': 'dy', 'dividendyield12m': 'dy',
    'vpa': 'vp_cota', 'vpporcota': 'vp_cota', 'valorpatrimonialporcota': 'vp_cota', 'valpatrimonial': 'vp_cota', 'vp_cota': 'vp_cota',
    'lpa': 'lpa', 'lucroporacao': 'lpa',
    'evebitda': 'ev_ebitda', 'ev/ebitda': 'ev_ebitda',
    'dividaliquidaebitda': 'divida_liquida_ebitda', 'dividaliquida/ebitda': 'divida_liquida_ebitda',
    'divliqebitda': 'divida_liquida_ebitda',
    
    // Rentabilidade e Margens
    'roe': 'roe',
    'margemliquida': 'margem_liquida', 'mliquida': 'margem_liquida',
    'margembruta': 'margem_bruta', 'mbruta': 'margem_bruta',
    'cagrreceita5anos': 'cagr_receita_5a', 'cagrreceita': 'cagr_receita_5a',
    'cagrlucros5anos': 'cagr_lucros_5a', 'cagrlucro': 'cagr_lucros_5a', 'cagrlucros': 'cagr_lucros_5a',
    'ultimorendimento': 'ultimo_rendimento', 'rendimento': 'ultimo_rendimento',
    
    // FIIs Específico
    'vacanciafisica': 'vacancia', 'vacancia': 'vacancia',
    'patrimonioliquido': 'patrimonio_liquido', 'patrimonio': 'patrimonio_liquido', 'patrim': 'patrimonio_liquido', 'patrimliq': 'patrimonio_liquido',
    'valordemercado': 'val_mercado', 'valormercado': 'val_mercado',
    'taxadeadministracao': 'taxa_adm', 'taxaadm': 'taxa_adm',
    'segmento': 'segmento',
    'tipodegestao': 'tipo_gestao', 'gestao': 'tipo_gestao',
    'liquidezmediadiaria': 'liquidez', 'liquidez': 'liquidez', 'liquidezdiaria': 'liquidez',
    'numerodecotistas': 'num_cotistas', 'cotistas': 'num_cotistas', 'numcotistas': 'num_cotistas'
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

        // Helper para extrair par chave/valor
        const extractPair = (keyRaw: string, valRaw: string) => {
            if (!keyRaw || !valRaw) return;
            const key = normalizeKey(keyRaw);
            if (KEY_MAP[key]) {
                extracted[KEY_MAP[key]] = valRaw;
            }
        };

        // 1. CARDS DO TOPO (P/VP, DY, COTAÇÃO)
        // Seletor: div._card -> _card-header + _card-body
        $('div._card').each((_, card) => {
            const header = $(card).find('div._card-header').text().trim() || $(card).find('.title').text().trim();
            const value = $(card).find('div._card-body').text().trim() || $(card).find('.value').text().trim();
            extractPair(header, value);
        });

        // 2. TABELA DE INDICADORES (Ações e FIIs)
        // Seletor: #table-indicators .cell -> .name + .value
        $('#table-indicators .cell').each((_, cell) => {
            const name = $(cell).find('.name').text().trim(); // Ex: "P/L", "P/VP"
            const valueEl = $(cell).find('.value');
            // Remove span com tooltip se houver
            valueEl.find('.help').remove(); 
            const value = valueEl.text().trim();
            extractPair(name, value);
        });

        // 3. DADOS BÁSICOS (FIIs: Vacância, Patrimônio, Gestão)
        // Seletor: #table-basic-data .cell -> .name + .value (ou .desc)
        $('#table-basic-data .cell').each((_, cell) => {
             const label = $(cell).find('.name').text().trim();
             const val = $(cell).find('.value, .desc').text().trim();
             extractPair(label, val);
        });

        // 4. ESTRUTURA GENÉRICA DE INFO (Fallback para Mobile Views)
        // Procura por estruturas <span class="title">Title</span> <span class="value">Value</span>
        $('.data-item, .item-info').each((_, item) => {
             const label = $(item).find('.title, .label').text().trim();
             const val = $(item).find('.value, .data').text().trim();
             extractPair(label, val);
        });

        // 5. Extração de Segmento Robusta (Breadcrumbs)
        if (!extracted.segmento) {
            let segmento = '';
            $('#breadcrumbs li, .breadcrumb-item').each((_, el) => {
                const txt = $(el).text().trim();
                // Ignora termos comuns de navegação
                if (txt && !['Início', 'Ações', 'FIIs', 'Home', 'BDRs', 'Fundos Imobiliários'].includes(txt) && txt.toUpperCase() !== ticker) {
                    segmento = txt;
                }
            });
            if (segmento) extracted['segmento'] = segmento;
        }

        // Garante cotação se falhou nos cards (Classe específica de cotação grande)
        if (!extracted.cotacao_atual) {
            extracted.cotacao_atual = $('.quotation-ticker, .value-ticker').first().text().trim();
        }

        // --- DIVIDENDOS ---
        const dividends: any[] = [];
        const tableSelectors = ['#table-dividends-history', 'table#dividends-history'];
        
        let foundTable = false;
        for (const sel of tableSelectors) {
            if ($(sel).length > 0) {
                $(sel).find('tbody tr').each((_, tr) => {
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
                foundTable = true;
                break;
            }
        }

        // Se não achou tabela de dividendos, tenta a tabela genérica que tem "Tipo", "Data Com", "Pagamento", "Valor"
        if (!foundTable) {
            $('table').each((_, table) => {
                const headers = $(table).find('thead th').text().toLowerCase();
                if (headers.includes('tipo') && headers.includes('data com') && headers.includes('valor')) {
                    $(table).find('tbody tr').each((_, tr) => {
                        const tds = $(tr).find('td');
                        if (tds.length >= 3) {
                             const dateComRaw = $(tds[1]).text().trim();
                             const datePayRaw = $(tds[2]).text().trim(); // Às vezes é col 2, às vezes col 3 dependendo do layout
                             const valRaw = $(tds[3] || tds[2]).text().trim(); 

                             const dateCom = parseToISODate(dateComRaw);
                             const val = parseValue(valRaw);
                             
                             if (dateCom && val > 0) {
                                 dividends.push({
                                    ticker: ticker.toUpperCase(),
                                    type: 'DIV', 
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
                
                // Campos de Texto Preservados
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
                ultimo_rendimento: metadata.ultimo_rendimento,
                num_cotistas: metadata.num_cotistas
            };
            // Limpa chaves undefined
            Object.keys(dbPayload).forEach(key => (dbPayload as any)[key] === undefined && delete (dbPayload as any)[key]);
            
            await supabase.from('ativos_metadata').upsert(dbPayload, { onConflict: 'ticker' });
        }

        return res.status(200).json({ success: true, data: metadata, dividends: cleanDividends });

    } catch (e: any) {
        console.error(`Erro Handler ${ticker}:`, e);
        return res.status(500).json({ success: false, error: e.message });
    }
}
