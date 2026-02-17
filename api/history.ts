
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import https from 'https';

const httpsAgent = new https.Agent({ 
    keepAlive: true,
    maxSockets: 100,
    timeout: 10000 
});

function getYahooParams(range: string) {
    switch (range) {
        case '1D': return { range: '1d', interval: '5m' };
        case '5D': return { range: '5d', interval: '15m' };
        case '1M': return { range: '1mo', interval: '1d' };
        case '6M': return { range: '6mo', interval: '1d' };
        case 'YTD': return { range: 'ytd', interval: '1d' };
        case '1Y': 
        case '1A': return { range: '1y', interval: '1d' };
        case '5Y': 
        case '5A': return { range: '5y', interval: '1wk' };
        case 'Tudo':
        case 'MAX': return { range: 'max', interval: '1mo' };
        default: return { range: '1y', interval: '1d' };
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const ticker = String(req.query.ticker || '').toUpperCase().trim();
    const range = String(req.query.range || '1Y');

    if (!ticker) return res.status(400).json({ error: 'Ticker required' });

    try {
        const symbol = ticker.endsWith('.SA') ? ticker : `${ticker}.SA`;
        const { range: yRange, interval } = getYahooParams(range);

        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${yRange}&interval=${interval}&includePrePost=false`;

        const { data } = await axios.get(url, { 
            httpsAgent,
            timeout: 8000 
        });

        const result = data.chart?.result?.[0];

        if (!result || !result.timestamp || !result.indicators.quote[0].close) {
            return res.status(404).json({ error: 'Dados não encontrados no Yahoo Finance' });
        }

        const timestamps = result.timestamp;
        const prices = result.indicators.quote[0].close;

        const points = timestamps.map((t: number, i: number) => {
            if (prices[i] === null || prices[i] === undefined) return null;
            return {
                date: new Date(t * 1000).toISOString(),
                timestamp: t * 1000,
                price: prices[i]
            };
        }).filter((p: any) => p !== null);

        return res.status(200).json({
            ticker,
            range,
            points
        });

    } catch (e: any) {
        console.error(`Yahoo Finance Error (${ticker}):`, e.message);
        return res.status(500).json({ error: 'Erro ao buscar histórico' });
    }
}
