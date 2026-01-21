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
        str = str.replace(/[^0-9,.-]/g, ''); 
        
        if (str.includes(',')) {
            str = str.replace(/\./g, ''); // Remove milhar
            str = str.replace(',', '.');  // Decimal
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
    'cotacao': 'cotacao_atual', 'valoratual': 'cotacao_atual', 'preco': 'cotacao_atual',
    'pvp': 'pvp', 'vp': 'pvp', 'psobrevp': 'pvp',
    'pl': 'pl', 'psorel': 'pl', 'precolucro': 'pl',
    'dy': 'dy', 'dividendyield': 'dy', 'dy12m': 'dy',
    'vpa': 'vp_cota', 'vpporcota': 'vp_cota', 'valorpatrimonialporcota': 'vp_cota',
    'lpa': 'lpa', 'lucroporacao': 'lpa',
    'evebitda': 'ev_ebitda',
    'roe': 'roe',
    'margemliquida': 'margem_liquida',
    'margembruta': 'margem_bruta',
    'dividaliquidaebitda': 'divida_liquida_ebitda',
    'cagrreceita5anos': 'cagr_receita_5a', 
    'cagrlucros5anos': 'cagr_lucros_5a',
    'vacanciafisica': 'vacancia', 'vacancia': 'vacancia',
    'ultimorendimento': 'ultimo_rendimento', 'rendimento': 'ultimo_rendimento',
    'patrimonioliquido': 'patrimonio_liquido',
    'taxadeadministracao': 'taxa_adm',
    'segmento': 'segmento',
    'tipodegestao': 'tipo_gestao',
    'liquidezmediadiaria': 'liquidez', 'liquidez': 'liquidez',
    'valordemercado': 'val_mercado'
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

        // 1. Extração de Metadados
        $('span, div, td, strong, b, h3, h4').each((_, el) => {
            const text = $(el).clone().children().remove().end().text().trim();
            if (!text || text.length > 50) return; 
            const normText = normalizeKey(text);
            if (KEY_MAP[normText] && !extracted[KEY_MAP[normText]]) {
                let value = $(el).next().text().trim() || $(el).siblings('.value').text().trim() || $(el).parent().find('.value').text().trim();
                if (value && (/[0-9]/.test(value) || value === '-')) {
                    extracted[KEY_MAP[normText]] = value;
                }
            }
        });

        if (!extracted.cotacao_atual) {
            extracted.cotacao_atual = $('div._card.cotacao div._card-body span').text();
        }

        // 2. Extração de Dividendos (SCANNER INTELIGENTE V2)
        const dividends: any[] = [];
        
        $('table').each((_, table) => {
            const $table = $(table);
            const headers = $table.find('thead th').map((_, th) => $(th).text().trim().toLowerCase()).get();
            const rows = $table.find('tbody tr');

            // Estratégia A: Headers Conhecidos
            let idxType = headers.findIndex(h => h.includes('tipo'));
            let idxCom = headers.findIndex(h => h.includes('data com') || h.includes('data-com') || h.includes('base'));
            let idxPay = headers.findIndex(h => h.includes('pagamento') || h.includes('data pag'));
            let idxVal = headers.findIndex(h => h.includes('valor'));

            // Estratégia B: Scanner Heurístico (Se headers falharem ou não existirem)
            // Analisa o conteúdo da primeira linha para "adivinhar" as colunas
            if (idxCom === -1 || idxVal === -1) {
                const firstRowTds = $(rows[0]).find('td');
                firstRowTds.each((i, td) => {
                    const txt = $(td).text().trim();
                    // Regex Data: DD/MM/AAAA
                    if (/\d{2}\/\d{2}\/\d{4}/.test(txt)) {
                        if (idxCom === -1) idxCom = i; // Assume a primeira data como Data Com
                        else if (idxPay === -1) idxPay = i; // Assume a segunda data como Pagamento
                    }
                    // Regex Valor: R$ 0,00 ou 0,0000
                    if ((txt.includes(',') || txt.includes('.')) && /[0-9]/.test(txt) && !/\d{2}\/\d{2}\/\d{4}/.test(txt)) {
                        if (idxVal === -1) idxVal = i;
                    }
                    // Regex Tipo
                    if (/(div|jcp|rend|juros|amor)/i.test(txt)) {
                        idxType = i;
                    }
                });
            }

            // Se achamos pelo menos Data Com e Valor, processa
            if (idxCom > -1 && idxVal > -1) {
                rows.each((_, tr) => {
                    const tds = $(tr).find('td');
                    if (tds.length >= 3) {
                        const typeRaw = idxType > -1 ? $(tds[idxType]).text().trim().toLowerCase() : 'div';
                        const dateComRaw = $(tds[idxCom]).text().trim();
                        const datePayRaw = idxPay > -1 ? $(tds[idxPay]).text().trim() : '';
                        const valRaw = $(tds[idxVal]).text().trim();

                        const dateCom = parseToISODate(dateComRaw);
                        const datePay = parseToISODate(datePayRaw);
                        const val = parseValue(valRaw);

                        if (dateCom && val > 0) {
                            let type = 'DIV';
                            if (typeRaw.includes('juros') || typeRaw.includes('jcp')) type = 'JCP';
                            else if (typeRaw.includes('rend')) type = 'REND';
                            else if (typeRaw.includes('amort') || typeRaw.includes('restitui')) type = 'AMORT';

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
            }
        });

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

        // Deduplicação inteligente
        const uniqueMap = new Map();
        dividends.forEach(d => {
            // Chave ignora a data de pagamento para agrupar eventos iguais
            const key = `${d.type}|${d.date_com}|${d.rate.toFixed(4)}`; 
            const existing = uniqueMap.get(key);
            
            // Prefere o registro que tenha Data de Pagamento preenchida
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
            Object.keys(dbPayload).forEach(key => dbPayload[key] === undefined && delete dbPayload[key]);
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

             // Limpeza de provisionados antigos
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
