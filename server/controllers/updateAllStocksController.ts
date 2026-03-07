import { Request, Response } from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// --- CONFIGURAÇÃO ---
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || ''
);

// --- AGENTE & HEADERS ---
const httpsAgent = new https.Agent({ 
    keepAlive: true,
    maxSockets: 128,
    timeout: 20000,
    rejectUnauthorized: false
});

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0'
];

const getRandomAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

const client = axios.create({
    httpsAgent,
    headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://investidor10.com.br/',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1'
    },
    timeout: 25000
});

async function fetchWithRetry(url: string) {
    // Configura UA randômico por requisição
    const config = {
        headers: { 'User-Agent': getRandomAgent() }
    };
    
    for (let i = 0; i < 3; i++) {
        try {
            return await client.get(url, config);
        } catch (error: any) {
            const status = error.response?.status;
            if (status === 404) throw error; 
            if (i === 2) throw error;
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
        }
    }
}

// --- HELPERS ---
function parseValue(valueStr: any): number {
    if (!valueStr) return 0;
    if (typeof valueStr === 'number') return valueStr;
    try {
        let clean = String(valueStr).replace(/[^0-9,-]+/g, '').trim();
        if (!clean || clean === '-') return 0;
        return parseFloat(clean.replace(',', '.')) || 0;
    } catch { return 0; }
}

function normalizeKey(str: string) {
    return str ? str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "").trim() : '';
}

// Mapa de chaves do Investidor10 para colunas DB
const KEY_MAP: Record<string, string> = {
    'cotacao': 'current_price', 'valoratual': 'current_price',
    'pvp': 'pvp', 'p/vp': 'pvp', 'vp': 'pvp',
    'pl': 'pl', 'p/l': 'pl',
    'dividendyield': 'dy_12m', 'dy': 'dy_12m',
    'roe': 'roe',
    'vacanciafisica': 'vacancia', 'vacancia': 'vacancia',
    'liquidezmediadiaria': 'liquidez', 'liquidez': 'liquidez',
    'valordemercado': 'valor_mercado',
    'margemliquida': 'margem_liquida',
    'dividaliquida/ebitda': 'divida_liquida_ebitda',
    'ev/ebitda': 'ev_ebitda'
};

async function scrapeInvestidor10(ticker: string) {
    const isFII = ticker.endsWith('11') || ticker.endsWith('11B');
    let url = `https://investidor10.com.br/${isFII ? 'fiis' : 'acoes'}/${ticker.toLowerCase()}/`;
    
    try {
        let response;
        try {
            response = await fetchWithRetry(url);
        } catch (e: any) {
            if (e.response?.status === 404) {
                // Tenta tipo inverso se falhar (ex: ticker 11 que é ação)
                url = `https://investidor10.com.br/${isFII ? 'acoes' : 'fiis'}/${ticker.toLowerCase()}/`;
                response = await fetchWithRetry(url);
            } else throw e;
        }

        if (!response || !response.data) return null;

        const $ = cheerio.load(response.data);
        const extracted: Record<string, any> = {};

        // Varre Cards e Tabelas com lógica unificada
        $('div._card, #table-indicators .cell').each((_, el) => {
            const label = $(el).find('div._card-header span, span.name').first().text() || $(el).find('div._card-header').text();
            const value = $(el).find('div._card-body span, div.value span, span.value').first().text() || $(el).find('div._card-body').text();
            
            if (label && value) {
                const normKey = normalizeKey(label);
                if (KEY_MAP[normKey]) {
                    extracted[KEY_MAP[normKey]] = ['liquidez', 'valor_mercado'].includes(KEY_MAP[normKey]) ? value.trim() : parseValue(value);
                }
            }
        });

        // Extração de Segmento Robusta
        let segmento = '';
        $('#breadcrumbs li span a span, .breadcrumb-item').each((_, el) => {
            const txt = $(el).text().trim();
            if (txt && !['Início', 'Ações', 'FIIs', 'Home'].includes(txt) && txt.toUpperCase() !== ticker) segmento = txt;
        });
        if (segmento) extracted['segment'] = segmento;

        return {
            ticker,
            type: isFII ? 'FII' : 'ACAO',
            segment: extracted.segment || 'Geral',
            // Principais
            current_price: extracted.current_price || 0,
            pvp: extracted.pvp || 0,
            pl: extracted.pl || 0,
            dy_12m: extracted.dy_12m || 0,
            roe: extracted.roe || 0,
            vacancia: extracted.vacancia || 0,
            liquidez: extracted.liquidez || '',
            valor_mercado: extracted.valor_mercado || '',
            // Extras
            margem_liquida: extracted.margem_liquida || 0,
            divida_liquida_ebitda: extracted.divida_liquida_ebitda || 0,
            ev_ebitda: extracted.ev_ebitda || 0,
            updated_at: new Date().toISOString()
        };
    } catch (e) {
        console.error(`Error scraping ${ticker}:`, e);
        return null;
    }
}

function chunkArray(arr: any[], size: number) {
    const res = [];
    for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
    return res;
}

export async function updateAllStocks(req: Request, res: Response) {
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    try {
        const { data: txs } = await supabase.from('transactions').select('ticker');
        const tickers = [...new Set((txs || []).map((t: any) => t.ticker.toUpperCase()))];
        
        if (tickers.length === 0) return res.json({ message: "No tickers." });

        // Lotes de 3 para respeitar timeout
        const batches = chunkArray(tickers, 3);
        let processedCount = 0;

        for (const batch of batches) {
            await Promise.all(batch.map(async (ticker) => {
                const data = await scrapeInvestidor10(ticker);
                if (data) {
                    await supabase.from('ativos_metadata').upsert(data, { onConflict: 'ticker' });
                    processedCount++;
                }
            }));
            // Delay gentil entre lotes
            await new Promise(r => setTimeout(r, 2000));
        }

        return res.json({ success: true, processed: processedCount, total: tickers.length });
    } catch (e: any) {
        return res.status(500).json({ error: e.message });
    }
}
