
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';

const httpsAgent = new https.Agent({ 
    keepAlive: true, 
    rejectUnauthorized: false 
});

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Referer': 'https://investidor10.com.br/',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
};

// Lista de Fallback
const POPULAR_ASSETS = [
    { ticker: 'MXRF11', type: 'fiis' }, { ticker: 'HGLG11', type: 'fiis' }, 
    { ticker: 'VISC11', type: 'fiis' }, { ticker: 'XPLG11', type: 'fiis' },
    { ticker: 'KNRI11', type: 'fiis' }, { ticker: 'CPTS11', type: 'fiis' },
    { ticker: 'PETR4', type: 'acoes' }, { ticker: 'VALE3', type: 'acoes' },
    { ticker: 'ITUB4', type: 'acoes' }, { ticker: 'BBAS3', type: 'acoes' },
    { ticker: 'WEGE3', type: 'acoes' }, { ticker: 'BBDC4', type: 'acoes' }
];

const parseBrFloat = (str: string) => {
    if (!str) return 0;
    const clean = str.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.');
    const float = parseFloat(clean);
    return isNaN(float) ? 0 : float;
};

// Helper para identificar FIIs (Final 11 ou 11B)
const isFiiTicker = (t: string) => t.toUpperCase().endsWith('11') || t.toUpperCase().endsWith('11B');

async function scrapeSingleAsset(ticker: string, type: string) {
    try {
        const url = `https://investidor10.com.br/${type}/${ticker.toLowerCase()}/`;
        const { data } = await axios.get(url, { headers: HEADERS, httpsAgent, timeout: 5000 });
        const $ = cheerio.load(data);

        const extractCard = (keyPart: string) => {
            let val = 0;
            $('div._card').each((_, card) => {
                const header = $(card).find('div._card-header').text().toLowerCase();
                if (header.includes(keyPart)) {
                    val = parseBrFloat($(card).find('div._card-body').text());
                }
            });
            return val;
        };

        const price = parseBrFloat($('div._card.cotacao div._card-body').text()) || parseBrFloat($('.quotation-ticker').text());
        const dy = extractCard('dividend yield');
        const p_vp = extractCard('p/vp');
        const p_l = extractCard('p/l');
        const name = $('h1.title-ticker').text().trim() || ticker;

        if (price > 0) {
            return { ticker, name, price, dy_12m: dy, p_vp, p_l };
        }
        return null;
    } catch (e) { return null; }
}

async function scrapeHome() {
    try {
        const { data } = await axios.get('https://investidor10.com.br/', { headers: HEADERS, httpsAgent, timeout: 8000 });
        const $ = cheerio.load(data);
        
        const extractTable = (selector: string) => {
            const items: any[] = [];
            $(selector).find('.item').each((_, el) => {
                const ticker = $(el).find('.name-ticker span').first().text().trim();
                const name = $(el).find('.name-ticker span').last().text().trim();
                const price = parseBrFloat($(el).find('.price').text());
                const variation = parseBrFloat($(el).find('.change').text());
                if (ticker && price > 0) items.push({ ticker, name, price, variation_percent: variation });
            });
            // Fallback table structure check
            if (items.length === 0) {
                $(selector).find('tr').slice(1).each((_, tr) => {
                    const tds = $(tr).find('td');
                    if (tds.length >= 3) {
                        const ticker = $(tds[0]).text().trim();
                        const price = parseBrFloat($(tds[1]).text());
                        const variation = parseBrFloat($(tds[2]).text());
                        if (ticker) items.push({ ticker, name: 'Ativo', price, variation_percent: variation });
                    }
                });
            }
            return items; // Retorna tudo para filtrar depois
        };

        return { 
            gainers: extractTable('#highs'), 
            losers: extractTable('#lows') 
        };
    } catch (e) {
        return { gainers: [], losers: [] };
    }
}

async function scrapeRanking(type: 'fiis' | 'acoes') {
    try {
        const url = `https://investidor10.com.br/${type}/ranking/`;
        const { data } = await axios.get(url, { headers: HEADERS, httpsAgent, timeout: 8000 });
        const $ = cheerio.load(data);
        
        const items: any[] = [];
        const table = $('#table-ranking, .table-ranking').first();
        
        table.find('tbody tr').each((_, tr) => {
            const tds = $(tr).find('td');
            if (tds.length < 5) return;

            const ticker = $(tds[0]).text().trim();
            const price = parseBrFloat($(tds[1]).text());
            
            let p_vp = 0;
            let dy = 0;
            let p_l = 0;

            if (type === 'fiis') {
                p_vp = parseBrFloat($(tds[2]).text());
                dy = parseBrFloat($(tds[3]).text());
            } else {
                p_l = parseBrFloat($(tds[2]).text());
                p_vp = parseBrFloat($(tds[3]).text());
                dy = parseBrFloat($(tds[4]).text());
            }

            if (price > 0 && ticker.length <= 6) {
                items.push({
                    ticker,
                    name: type === 'fiis' ? 'Fundo Imobiliário' : 'Ação',
                    price,
                    p_vp,
                    p_l,
                    dy_12m: dy
                });
            }
        });

        return items;
    } catch (e) { return []; }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        let [homeData, fiisRaw, stocksRaw] = await Promise.all([
            scrapeHome(),
            scrapeRanking('fiis'),
            scrapeRanking('acoes')
        ]);

        // Fallback Logic
        const hasData = fiisRaw.length > 5 && stocksRaw.length > 5;
        if (!hasData) {
            const fallbackResults = await Promise.all(
                POPULAR_ASSETS.map(asset => scrapeSingleAsset(asset.ticker, asset.type))
            );
            const validFallback = fallbackResults.filter(Boolean) as any[];
            fiisRaw = validFallback.filter(a => POPULAR_ASSETS.find(p => p.ticker === a.ticker)?.type === 'fiis');
            stocksRaw = validFallback.filter(a => POPULAR_ASSETS.find(p => p.ticker === a.ticker)?.type === 'acoes');
        }

        // --- SEPARAÇÃO ESTRITA DE ALTAS/BAIXAS ---
        const fiiGainers = homeData.gainers.filter(i => isFiiTicker(i.ticker)).slice(0, 5);
        const fiiLosers = homeData.losers.filter(i => isFiiTicker(i.ticker)).slice(0, 5);
        
        const stockGainers = homeData.gainers.filter(i => !isFiiTicker(i.ticker)).slice(0, 5);
        const stockLosers = homeData.losers.filter(i => !isFiiTicker(i.ticker)).slice(0, 5);

        // --- FILTRAGEM DE RANKINGS ---

        // 1. FIIs
        const highYieldFIIs = [...fiisRaw]
            .filter(f => f.dy_12m > 9 && f.dy_12m < 25 && f.p_vp >= 0.8)
            .sort((a, b) => b.dy_12m - a.dy_12m)
            .slice(0, 6);

        const discountedFIIs = [...fiisRaw]
            .filter(f => f.p_vp < 0.98 && f.p_vp > 0.5 && f.dy_12m > 6)
            .sort((a, b) => a.p_vp - b.p_vp)
            .slice(0, 6);

        // 2. Ações
        const discountedStocks = [...stocksRaw]
            .filter(s => s.p_l > 1 && s.p_l < 12 && s.p_vp < 3)
            .sort((a, b) => a.p_l - b.p_l)
            .slice(0, 6);

        const highYieldStocks = [...stocksRaw]
            .filter(s => s.dy_12m > 6 && s.dy_12m < 30)
            .sort((a, b) => b.dy_12m - a.dy_12m)
            .slice(0, 6);

        const response = {
            market_status: "Aberto",
            last_update: new Date().toISOString(),
            highlights: {
                fiis: {
                    gainers: fiiGainers,
                    losers: fiiLosers,
                    high_yield: highYieldFIIs,
                    discounted: discountedFIIs
                },
                stocks: {
                    gainers: stockGainers,
                    losers: stockLosers,
                    high_yield: highYieldStocks,
                    discounted: discountedStocks
                }
            },
            sources: [{ title: 'Investidor10', uri: 'https://investidor10.com.br' }]
        };

        return res.status(200).json(response);

    } catch (error: any) {
        console.error('API Market Fatal Error:', error);
        return res.status(500).json({ error: true, message: error.message });
    }
}
