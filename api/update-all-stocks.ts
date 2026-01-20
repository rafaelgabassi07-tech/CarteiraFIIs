
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY || ''
);

const httpsAgent = new https.Agent({ keepAlive: true, rejectUnauthorized: false });
const client = axios.create({
    httpsAgent,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Referer': 'https://investidor10.com.br/'
    },
    timeout: 20000
});

// Helpers duplicados do update-stock.ts para garantir independência da Serverless Function
function parseValue(valueStr: any): number {
    if (!valueStr) return 0;
    if (typeof valueStr === 'number') return valueStr;
    let clean = String(valueStr).replace(/R\$|\%|\s|\n/g, '').trim();
    if (clean === '-' || clean === '--') return 0;
    if (clean.includes('.') && clean.includes(',')) clean = clean.replace(/\./g, '').replace(',', '.');
    else if (clean.includes(',')) clean = clean.replace(',', '.');
    else if (clean.includes('.') && !clean.includes(',')) clean = clean.replace(/\./g, '');
    const floatVal = parseFloat(clean);
    return isNaN(floatVal) ? 0 : floatVal;
}

function normalizeKey(str: string) {
    return str ? str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "").trim() : '';
}

const KEY_MAP: Record<string, string> = {
    'cotacao': 'current_price', 'valoratual': 'current_price', 'preconofechamento': 'current_price',
    'pvp': 'pvp', 'p/vp': 'pvp', 'vp': 'pvp',
    'pl': 'pl', 'p/l': 'pl',
    'dividendyield': 'dy_12m', 'dy': 'dy_12m', 'yield': 'dy_12m',
    'roe': 'roe', 'returnonequity': 'roe',
    'vacanciafisica': 'vacancia', 'vacancia': 'vacancia',
    'liquidezmediadiaria': 'liquidez', 'liquidez': 'liquidez',
    'valordemercado': 'valor_mercado'
};

async function scrapeInvestidor10(ticker: string) {
    const isFII = ticker.endsWith('11') || ticker.endsWith('11B');
    let url = `https://investidor10.com.br/${isFII ? 'fiis' : 'acoes'}/${ticker.toLowerCase()}/`;
    
    try {
        let response;
        try {
            response = await client.get(url);
        } catch (e: any) {
            if (e.response?.status === 404) {
                url = `https://investidor10.com.br/${isFII ? 'acoes' : 'fiis'}/${ticker.toLowerCase()}/`;
                response = await client.get(url);
            } else throw e;
        }

        const $ = cheerio.load(response.data);
        const extracted: Record<string, any> = {};

        // Cards e Tabela
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

        // Segmento
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
            current_price: extracted.current_price || 0,
            pvp: extracted.pvp || 0,
            pl: extracted.pl || 0,
            dy_12m: extracted.dy_12m || 0,
            roe: extracted.roe || 0,
            vacancia: extracted.vacancia || 0,
            liquidez: extracted.liquidez || '',
            valor_mercado: extracted.valor_mercado || '',
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { data: txs } = await supabase.from('transactions').select('ticker');
        const tickers = [...new Set((txs || []).map((t: any) => t.ticker.toUpperCase()))];
        
        if (tickers.length === 0) return res.json({ message: "No tickers." });

        // Processa em lotes de 3 para não estourar timeout da Vercel
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
            await new Promise(r => setTimeout(r, 1000)); // Delay gentil
        }

        return res.json({ success: true, processed: processedCount, total: tickers.length });
    } catch (e: any) {
        return res.status(500).json({ error: e.message });
    }
}
