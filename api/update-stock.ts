
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

// Lista de User-Agents mais moderna e variada
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.4; rv:124.0) Gecko/20100101 Firefox/124.0'
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
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'same-origin',
                    'Sec-Fetch-User': '?1'
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
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .replace(/[^a-z0-9]/g, "") // Remove especiais
        .trim();
}

// Mapa atualizado para capturar dados dos novos Cards do Investidor10
const KEY_MAP: Record<string, string> = {
    'cotacao': 'cotacao_atual', 'valoratual': 'cotacao_atual',
    'pvp': 'pvp', 'vp': 'pvp',
    'pl': 'pl',
    'dy': 'dy', 'dividendyield': 'dy', 'dy12m': 'dy',
    'vpa': 'vp_cota', 'vp': 'vp_cota', 'valorpatrimonial': 'vp_cota',
    'lpa': 'lpa',
    'vacanciafisica': 'vacancia', 'vacancia': 'vacancia',
    'ultimorendimento': 'ultimo_rendimento', 
    'patrimonioliquido': 'patrimonio_liquido',
    'tipodegestao': 'tipo_gestao',
    'taxadeadministracao': 'taxa_adm',
    'liquidezmediadiaria': 'liquidez', 'liquidez': 'liquidez',
    'valordemercado': 'val_mercado',
    'roe': 'roe',
    'margemliquida': 'margem_liquida',
    'margembruta': 'margem_bruta',
    'evebitda': 'ev_ebitda',
    'dividaliquidaebitda': 'divida_liquida_ebitda'
};

// ---------------------------------------------------------
// SCRAPER ENGINE "HUNTER V2"
// ---------------------------------------------------------

async function scrapeInvestidor10(ticker: string) {
    try {
        const isFII = ticker.endsWith('11') || ticker.endsWith('11B');
        
        const strategies = isFII 
            ? [`/fiis/${ticker.toLowerCase()}/`, `/acoes/${ticker.toLowerCase()}/`]
            : [`/acoes/${ticker.toLowerCase()}/`, `/bdrs/${ticker.toLowerCase()}/`, `/fiis/${ticker.toLowerCase()}/`];

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

        // 1. Extração via Cards (Nova Estrutura do Investidor10)
        // Eles usam <div class="_card {tipo}"> <div class="_card-header">Título</div> <div class="_card-body">Valor</div> </div>
        $('div._card').each((_, el) => {
            const headerText = $(el).find('div._card-header').text().trim();
            const bodyText = $(el).find('div._card-body').text().trim();
            
            if (headerText && bodyText) {
                const normKey = normalizeKey(headerText);
                const dbKey = KEY_MAP[normKey];
                
                if (dbKey) {
                    extracted[dbKey] = bodyText;
                }
            }
        });

        // 2. Extração via Tabela de Indicadores (Ações usam muito isso)
        $('div#table-indicators div.cell').each((_, el) => {
            const headerText = $(el).find('span.name').text().trim() || $(el).find('div.name').text().trim();
            const bodyText = $(el).find('div.value span').text().trim() || $(el).find('span.value').text().trim();

            if (headerText && bodyText) {
                const normKey = normalizeKey(headerText);
                const dbKey = KEY_MAP[normKey];
                
                if (dbKey && !extracted[dbKey]) {
                    extracted[dbKey] = bodyText;
                }
            }
        });

        // 3. Fallback para Dados de Cabeçalho (Topo da página)
        if (!extracted.cotacao_atual) {
            const cotacaoHeader = $('div._card.cotacao div._card-body span').text().trim();
            if (cotacaoHeader) extracted.cotacao_atual = cotacaoHeader;
        }

        // Extração do Segmento
        let segmento = '';
        $('#breadcrumbs li span a span, .breadcrumb-item').each((_, el) => {
            const txt = $(el).text().trim();
            if (txt && !['Início', 'Ações', 'FIIs', 'Home', 'BDRs'].includes(txt) && txt.toUpperCase() !== ticker) segmento = txt;
        });
        extracted.segmento = segmento;

        const result = {
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
            
            // Campos específicos FII (agora via cards específicos)
            vacancia: parseValue(extracted.vacancia),
            ultimo_rendimento: parseValue(extracted.ultimo_rendimento),
            patrimonio_liquido: extracted.patrimonio_liquido || 'N/A',
            tipo_gestao: extracted.tipo_gestao || 'N/A',
            taxa_adm: extracted.taxa_adm || 'N/A',
            
            liquidez: extracted.liquidez || 'N/A',
            val_mercado: extracted.val_mercado || 'N/A',
            
            margem_liquida: parseValue(extracted.margem_liquida),
            margem_bruta: parseValue(extracted.margem_bruta),
            divida_liquida_ebitda: parseValue(extracted.divida_liquida_ebitda),
            ev_ebitda: parseValue(extracted.ev_ebitda)
        };

        return result;

    } catch (e: any) {
        console.error(`Erro Scraping ${ticker}: ${e.message}`);
        return null;
    }
}

// ---------------------------------------------------------
// PROVENTOS (STATUS INVEST)
// ---------------------------------------------------------
async function scrapeStatusInvestProventos(ticker: string) {
    try {
        const t = ticker.toUpperCase().replace(/F$/, ''); // ITSA4F -> ITSA4
        let type = 'acoes';
        if (t.endsWith('11') || t.endsWith('11B') || t.endsWith('33') || t.endsWith('34')) type = 'fiis'; 

        const refererUrl = `https://statusinvest.com.br/${type}/${t.toLowerCase()}`;
        const apiUrl = `https://statusinvest.com.br/${type}/companytickerprovents?ticker=${t}&chartProventsType=2`;

        // Tenta 2 vezes com delay
        for (let i = 0; i < 2; i++) {
            try {
                const response = await axios.get(apiUrl, {
                    httpsAgent,
                    headers: {
                        'User-Agent': getRandomAgent(),
                        'Accept': 'application/json, text/javascript, */*; q=0.01',
                        'Referer': refererUrl,
                        'X-Requested-With': 'XMLHttpRequest',
                        'Cache-Control': 'no-cache'
                    },
                    timeout: 10000
                });

                const data = response.data;
                const earnings = data.assetEarningsModels || [];

                return earnings.map((d: any) => {
                    const parseDateJSON = (dStr: string) => {
                        if (!dStr || dStr.trim() === '' || dStr.trim() === '-') return null;
                        if (dStr.includes('/')) {
                            const parts = dStr.split('/');
                            if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
                        }
                        if (dStr.includes('-') && dStr.length >= 10) return dStr.substring(0, 10);
                        return null;
                    };
                    
                    let labelTipo = 'REND'; 
                    if (d.et === 1) labelTipo = 'DIV';
                    else if (d.et === 2) labelTipo = 'JCP';
                    else if (d.et === 3 || type === 'fiis') labelTipo = 'REND'; 
                    else if (String(d.etLabel).toLowerCase().includes('juros')) labelTipo = 'JCP';
                    
                    return {
                        ticker: ticker.toUpperCase(),
                        type: labelTipo,
                        date_com: parseDateJSON(d.ed),
                        payment_date: parseDateJSON(d.pd),
                        rate: d.v
                    };
                }).filter((d: any) => d.payment_date !== null && d.rate > 0);

            } catch (err) {
                if (i === 1) throw err;
                await new Promise(r => setTimeout(r, 2000));
            }
        }
        return [];

    } catch (error: any) { 
        console.warn(`Erro scraping proventos ${ticker}: ${error.message}`);
        return []; 
    }
}

// ---------------------------------------------------------
// HANDLER
// ---------------------------------------------------------
export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const ticker = String(req.query.ticker || '').trim().toUpperCase();
    if (!ticker) return res.status(400).json({ error: 'Ticker required' });

    try {
        const [metadata, proventos] = await Promise.all([
            scrapeInvestidor10(ticker),
            scrapeStatusInvestProventos(ticker)
        ]);
        
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
                vpa: metadata.vp_cota, // Importante: Salva VPA
                vp_cota: metadata.vp_cota,
                margem_liquida: metadata.margem_liquida,
                margem_bruta: metadata.margem_bruta,
                divida_liquida_ebitda: metadata.divida_liquida_ebitda,
                ev_ebitda: metadata.ev_ebitda,
                tipo_gestao: metadata.tipo_gestao,
                patrimonio_liquido: metadata.patrimonio_liquido,
                taxa_adm: metadata.taxa_adm,
                ultimo_rendimento: metadata.ultimo_rendimento
            };

            // Remove chaves undefined
            Object.keys(dbPayload).forEach(key => dbPayload[key] === undefined && delete dbPayload[key]);

            const { error: metaError } = await supabase.from('ativos_metadata').upsert(dbPayload, { onConflict: 'ticker' });
            if (metaError) console.error('Supabase Meta Error:', metaError);
        }

        if (proventos.length > 0) {
             await supabase.from('market_dividends').upsert(proventos, { 
                onConflict: 'ticker, type, date_com, payment_date, rate', 
                ignoreDuplicates: true 
            });
        }

        if (!metadata) {
            return res.status(404).json({ success: false, error: 'Dados não encontrados.' });
        }

        return res.status(200).json({ success: true, data: metadata, dividends: proventos });

    } catch (e: any) {
        console.error(`Erro Handler ${ticker}:`, e);
        return res.status(500).json({ success: false, error: e.message });
    }
}
