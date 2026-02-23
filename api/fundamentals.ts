
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import https from 'https';

const httpsAgent = new https.Agent({ 
    keepAlive: true,
    maxSockets: 100,
    timeout: 10000,
    rejectUnauthorized: false
});

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'X-Requested-With': 'XMLHttpRequest'
};

interface AssetIds {
    tickerId: string;
    companyId: string;
}

// Simple in-memory cache for IDs to avoid scraping every time (per lambda instance)
const idCache = new Map<string, AssetIds>();

async function getAssetIds(ticker: string): Promise<AssetIds | null> {
    if (idCache.has(ticker)) return idCache.get(ticker)!;

    try {
        const url = `https://investidor10.com.br/acoes/${ticker}/`;
        const { data } = await axios.get(url, { 
            headers: { ...HEADERS, 'Accept': 'text/html' }, 
            httpsAgent, 
            timeout: 5000 
        });

        const companyIdMatch = data.match(/companyId["']?\s*[:=]\s*["']?(\d+)["']?/i);
        const tickerIdMatch = data.match(/tickerId["']?\s*[:=]\s*["']?(\d+)["']?/i);
        
        // Fallback for tickerId (sometimes just "id: 123")
        const idMatch = data.match(/id:\s*(\d+)/);

        const companyId = companyIdMatch ? companyIdMatch[1] : null;
        const tickerId = tickerIdMatch ? tickerIdMatch[1] : (idMatch ? idMatch[1] : null);

        if (companyId && tickerId) {
            const ids = { companyId, tickerId };
            idCache.set(ticker, ids);
            return ids;
        }
    } catch (e) {
        console.error(`Failed to scrape IDs for ${ticker}:`, e);
    }
    return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const ticker = String(req.query.ticker || '').toUpperCase().trim();
    const type = String(req.query.type || '');

    if (!ticker || !type) return res.status(400).json({ error: 'Ticker and type required' });

    try {
        const ids = await getAssetIds(ticker);
        if (!ids) {
            return res.status(404).json({ error: 'Asset IDs not found' });
        }

        let url = '';
        const { companyId, tickerId } = ids;

        switch (type) {
            case 'revenue_profit':
                // /api/balancos/receitaliquida/chart/{id}/3650/false/
                // Uses companyId
                url = `https://investidor10.com.br/api/balancos/receitaliquida/chart/${companyId}/3650/false/`;
                break;
            
            case 'price_profit':
                // /api/cotacao-lucro/{ticker}/adjusted/
                // Uses ticker
                url = `https://investidor10.com.br/api/cotacao-lucro/${ticker}/adjusted/`;
                break;

            case 'equity':
                // /api/balancos/ativospassivos/chart/{id}/3650/
                // Uses companyId
                url = `https://investidor10.com.br/api/balancos/ativospassivos/chart/${companyId}/3650/`;
                break;

            case 'payout':
                // /api/acoes/payout-chart/{companyId}/{tickerId}/{ticker}/3650
                url = `https://investidor10.com.br/api/acoes/payout-chart/${companyId}/${tickerId}/${ticker}/3650`;
                break;

            default:
                return res.status(400).json({ error: 'Invalid type' });
        }

        const { data } = await axios.get(url, { 
            headers: { ...HEADERS, 'Referer': `https://investidor10.com.br/acoes/${ticker}/` }, 
            httpsAgent, 
            timeout: 8000 
        });

        return res.status(200).json(data);

    } catch (e: any) {
        console.error(`Fundamentals API Error (${type}):`, e.message);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
