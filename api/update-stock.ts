
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY || ''
);

// --- CONFIGURAÇÃO ROBUSTA ---

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
];

const getRandomAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

const httpsAgent = new https.Agent({ 
    keepAlive: true, 
    rejectUnauthorized: false 
});

// Função de Retry Inteligente
async function fetchWithRetry(url: string, retries = 3, delay = 1000): Promise<any> {
    try {
        const client = axios.create({
            httpsAgent,
            headers: {
                'User-Agent': getRandomAgent(),
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                'Referer': 'https://investidor10.com.br/',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            timeout: 20000 
        });
        return await client.get(url);
    } catch (err: any) {
        if (retries > 0) {
            console.warn(`[Retry] Falha em ${url}. Tentando novamente em ${delay}ms... Restam: ${retries}`);
            await new Promise(res => setTimeout(res, delay));
            return fetchWithRetry(url, retries - 1, delay * 2); // Exponential Backoff
        }
        throw err;
    }
}

// Helper: Parsing Numérico Seguro e Agressivo
function parseValue(valueStr: any): number {
    if (!valueStr) return 0;
    if (typeof valueStr === 'number') return valueStr;
    
    let clean = String(valueStr).trim();
    if (clean === '-' || clean === '--' || clean === 'N/A') return 0;

    // Mantém apenas números, vírgula, ponto e sinal de menos
    clean = clean.replace(/[^0-9.,-]/g, '');
    
    // Lógica para detectar milhar vs decimal
    // Ex: 1.234,56 -> 1234.56
    // Ex: 1,234.56 -> 1234.56
    // Ex: 12,34 -> 12.34
    
    if (clean.includes(',') && clean.includes('.')) {
        if (clean.indexOf(',') > clean.indexOf('.')) {
             // Formato US (1.234,56) - Raro no BR, mas possível
             clean = clean.replace(/\./g, '').replace(',', '.');
        } else {
             // Formato BR Invertido? Geralmente não acontece, assumimos BR (1.234,56)
             clean = clean.replace(/\./g, '').replace(',', '.');
        }
    } else if (clean.includes(',')) {
        clean = clean.replace(',', '.');
    }

    const floatVal = parseFloat(clean);
    return isNaN(floatVal) ? 0 : floatVal;
}

function normalizeKey(str: string) {
    if (!str) return '';
    return str.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .replace(/[^a-z0-9]/g, "") // Remove tudo que não for letra ou numero
        .trim();
}

const KEY_MAP: Record<string, string> = {
    // Preço
    'cotacao': 'current_price', 'valoratual': 'current_price', 'preconofechamento': 'current_price',
    
    // Valuation
    'pvp': 'pvp', 'p/vp': 'pvp', 'vp': 'pvp',
    'pl': 'pl', 'p/l': 'pl', 'precolucro': 'pl',
    
    // Dividendos
    'dividendyield': 'dy_12m', 'dy': 'dy_12m', 'yield': 'dy_12m', 'dy12m': 'dy_12m',
    
    // Eficiência
    'roe': 'roe', 'returnonequity': 'roe',
    
    // FIIs
    'vacanciafisica': 'vacancia', 'vacancia': 'vacancia',
    
    // Geral
    'liquidezmediadiaria': 'liquidez', 'liquidez': 'liquidez', 'vol.medio': 'liquidez',
    'valordemercado': 'valor_mercado', 'patrimonioliquido': 'valor_mercado'
};

async function scrapeInvestidor10Metadata(ticker: string, type: 'fiis' | 'acoes') {
    const url = `https://investidor10.com.br/${type}/${ticker.toLowerCase()}/`;
    
    try {
        const { data: html } = await fetchWithRetry(url);
        const $ = cheerio.load(html);
        const extracted: Record<string, any> = {};

        // ESTRATÉGIA 1: Cards do Topo (Busca por texto exato nos headers)
        // Isso é mais seguro que confiar em classes css como `._card`
        const processElement = (label: string, value: string) => {
            if (label && value) {
                const normKey = normalizeKey(label);
                // Tenta correspondência exata ou parcial
                let mappedKey = KEY_MAP[normKey];
                
                // Fallback para chaves parciais (ex: "P/VP" vira "pvp")
                if (!mappedKey) {
                    Object.keys(KEY_MAP).forEach(k => {
                        if (normKey.includes(k) && !mappedKey) mappedKey = KEY_MAP[k];
                    });
                }

                if (mappedKey) {
                    extracted[mappedKey] = ['liquidez', 'valor_mercado'].includes(mappedKey)
                        ? value.trim() 
                        : parseValue(value);
                }
            }
        };

        // Varre todos os cartões de dados
        $('div._card').each((_, el) => {
            const label = $(el).find('div._card-header').text();
            const value = $(el).find('div._card-body').text();
            processElement(label, value);
        });

        // Varre a tabela de indicadores (comum em ações)
        $('#table-indicators .cell').each((_, el) => {
            const label = $(el).find('.name').text();
            const value = $(el).find('.value').text();
            processElement(label, value);
        });

        // ESTRATÉGIA DE SEGURANÇA (Fallback):
        // Se P/VP ou DY ainda estiverem vazios, faz busca textual bruta
        if (!extracted['pvp'] || !extracted['dy_12m']) {
             $('span, div, h3, h4').each((_, el) => {
                 const txt = $(el).text().trim().toUpperCase();
                 // Verifica se é um rótulo conhecido
                 if (['P/VP', 'DY', 'P/L', 'V.P.', 'VACÂNCIA'].includes(txt)) {
                     // Tenta pegar o próximo elemento ou o pai->proximo
                     let val = $(el).next().text().trim();
                     if (!val) val = $(el).parent().find('.value, span').last().text().trim();
                     if (val && val !== txt) {
                         processElement(txt, val);
                     }
                 }
             });
        }

        // 3. Segmento
        let segmento = '';
        $('#breadcrumbs li, .breadcrumb-item').each((_, el) => {
            const txt = $(el).text().trim();
            if (txt && !['Início', 'Ações', 'FIIs', 'Home', 'Cotovelos', '>'].includes(txt) && txt.toUpperCase() !== ticker) {
                // Geralmente o segmento é o penúltimo ou antepenúltimo item
                if (txt.length > 3) segmento = txt;
            }
        });
        if (segmento) extracted['segment'] = segmento;

        // SANITY CHECK
        if (!extracted.current_price && !extracted.dy_12m) {
            console.warn(`[Scraper Warning] ${ticker}: Dados fundamentais vazios.`);
        }

        return { metadata: extracted };

    } catch (e: any) {
        if (e.response?.status === 404) return null;
        throw e;
    }
}

async function scrapeProventosInvestidor10(ticker: string, type: 'fiis' | 'acoes') {
    const url = `https://investidor10.com.br/${type}/${ticker.toLowerCase()}/`;
    try {
        const { data: html } = await fetchWithRetry(url);
        const $ = cheerio.load(html);
        const proventos: any[] = [];

        $('#table-dividends-history tbody tr').each((_, tr) => {
            const cols = $(tr).find('td');
            if (cols.length >= 4) {
                const typeRaw = $(cols[0]).text().trim().toUpperCase();
                const dateComRaw = $(cols[1]).text().trim();
                const datePayRaw = $(cols[2]).text().trim();
                const valueRaw = $(cols[3]).text().trim();

                const parseDate = (s: string) => {
                    if (!s || s === '-') return null;
                    const parts = s.split('/');
                    if (parts.length !== 3) return null;
                    return `${parts[2]}-${parts[1]}-${parts[0]}`;
                };

                const dateCom = parseDate(dateComRaw);
                const datePay = parseDate(datePayRaw); 
                const rate = parseValue(valueRaw);

                if (dateCom && rate > 0) {
                    let type = 'DIV';
                    if (typeRaw.includes('JCP') || typeRaw.includes('JUROS')) type = 'JCP';
                    else if (typeRaw.includes('RENDIMENTO')) type = 'REND';

                    proventos.push({
                        ticker,
                        type,
                        date_com: dateCom,
                        payment_date: datePay || dateCom,
                        rate
                    });
                }
            }
        });
        return proventos;
    } catch (e) {
        console.error(`Erro Investidor10 Proventos [${ticker}]:`, e);
        return [];
    }
}

async function scrapeProventosStatusInvest(ticker: string) {
    try {
        const baseTicker = ticker.replace(/F$/, '');
        const typeUrl = (baseTicker.endsWith('11') || baseTicker.endsWith('11B')) ? 'fii' : 'acao';
        const url = `https://statusinvest.com.br/${typeUrl}/companytickerprovents?ticker=${baseTicker}&chartProventsType=2`;
        
        const { data } = await fetchWithRetry(url);
        
        return (data.assetEarningsModels || []).map((d: any) => {
            const parseDate = (s: string) => s ? s.split('/').reverse().join('-') : null;
            return {
                ticker,
                type: d.et === 1 ? 'DIV' : d.et === 2 ? 'JCP' : 'REND',
                date_com: parseDate(d.ed),
                payment_date: parseDate(d.pd) || parseDate(d.ed),
                rate: d.v
            };
        }).filter((d: any) => d.date_com && d.rate > 0);
    } catch { return []; }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { ticker } = req.query;
    const stock = String(ticker).trim().toUpperCase();

    if (!stock || stock === 'UNDEFINED') return res.status(400).json({ error: 'Ticker required' });

    try {
        const isFII = stock.endsWith('11') || stock.endsWith('11B');
        let typeStr: 'fiis' | 'acoes' = isFII ? 'fiis' : 'acoes';
        
        // 1. Busca Metadata (Investidor10) com Retry e Lógica Semântica
        let result = await scrapeInvestidor10Metadata(stock, typeStr);
        if (!result || Object.keys(result.metadata).length <= 2) {
            // Se falhou ou trouxe poucos dados, tenta o outro tipo de ativo
            typeStr = isFII ? 'acoes' : 'fiis';
            const retryResult = await scrapeInvestidor10Metadata(stock, typeStr);
            if (retryResult && Object.keys(retryResult.metadata).length > 2) {
                result = retryResult;
            }
        }

        if (!result || !result.metadata) throw new Error('Dados fundamentais não encontrados');
        const data = result.metadata;

        const payload = {
            ticker: stock,
            type: isFII ? 'FII' : 'ACAO',
            segment: data.segment || 'Geral',
            current_price: data.current_price || 0,
            pvp: data.pvp || 0,
            pl: data.pl || 0,
            dy_12m: data.dy_12m || 0,
            roe: data.roe || 0,
            vacancia: data.vacancia || 0,
            liquidez: data.liquidez || '',
            valor_mercado: data.valor_mercado || '',
            updated_at: new Date().toISOString()
        };

        await supabase.from('ativos_metadata').upsert(payload, { onConflict: 'ticker' });

        // 2. Busca Proventos
        let proventos = await scrapeProventosStatusInvest(stock);
        
        // Fallback Trigger
        if (proventos.length === 0 || ['ITSA4', 'ITSA3', 'PETR4', 'PETR3', 'VALE3', 'BBAS3'].includes(stock)) {
             console.log(`[Fallback] Ativando scraping alternativo para ${stock}`);
             const proventosFallback = await scrapeProventosInvestidor10(stock, typeStr);
             
             const existingSigs = new Set(proventos.map((p: any) => `${p.date_com}-${p.rate}-${p.type}`));
             proventosFallback.forEach((p: any) => {
                 const sig = `${p.date_com}-${p.rate}-${p.type}`;
                 if (!existingSigs.has(sig)) {
                     proventos.push(p);
                 }
             });
        }

        if (proventos.length > 0) {
            await supabase.from('market_dividends').upsert(proventos, { 
                onConflict: 'ticker, type, date_com, payment_date, rate', 
                ignoreDuplicates: true 
            });
        }

        return res.status(200).json({ success: true, data: payload, dividends_count: proventos.length });

    } catch (error: any) {
        console.error(`Update Error [${stock}]:`, error.message);
        return res.status(500).json({ error: error.message });
    }
}
