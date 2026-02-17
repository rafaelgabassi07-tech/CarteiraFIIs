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
        case '1Y': return { range: '1y', interval: '1d' };
        case '2Y': return { range: '2y', interval: '1wk' };
        case '5Y': return { range: '5y', interval: '1wk' };
        case 'MAX': return { range: 'max', interval: '1mo' };
        default: return { range: '1y', interval: '1d' };
    }
}

async function fetchYahooData(symbol: string, range: string) {
    const s = symbol.includes('^') ? symbol : (symbol.endsWith('.SA') ? symbol : `${symbol}.SA`);
    const { range: yRange, interval } = getYahooParams(range);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${s}?range=${yRange}&interval=${interval}&includePrePost=false`;
    
    try {
        const { data } = await axios.get(url, { httpsAgent, timeout: 8000 });
        const result = data.chart?.result?.[0];
        if (!result || !result.timestamp || !result.indicators.quote[0].close) return null;
        
        return {
            timestamps: result.timestamp as number[],
            prices: result.indicators.quote[0].close as (number | null)[]
        };
    } catch (e) {
        return null;
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const ticker = String(req.query.ticker || '').toUpperCase().trim();
    // benchmark param is deprecated/ignored, we fetch specific indices now
    const range = String(req.query.range || '1Y');

    if (!ticker) return res.status(400).json({ error: 'Ticker required' });

    try {
        // Fetch Asset Data and Benchmarks in parallel
        const [assetData, ibovData, ifixData] = await Promise.all([
            fetchYahooData(ticker, range),
            fetchYahooData('^BVSP', range), // IBOVESPA
            fetchYahooData('IFIX.SA', range) // IFIX
        ]);

        if (!assetData) return res.status(404).json({ error: 'Asset not found' });

        // Process Data
        const points = [];
        const { timestamps, prices } = assetData;
        
        // Helper to find start price
        const getStartPrice = (pricesArr: (number|null)[]) => {
            for (let i = 0; i < pricesArr.length; i++) {
                if (pricesArr[i] !== null && pricesArr[i] !== undefined) return pricesArr[i] as number;
            }
            return 0;
        };

        const startPrice = getStartPrice(prices);
        const startIbov = ibovData ? getStartPrice(ibovData.prices) : 0;
        const startIfix = ifixData ? getStartPrice(ifixData.prices) : 0;

        // Maps for O(1) lookup by date
        const createPriceMap = (data: any) => {
            const map = new Map<string, number>();
            if (!data) return map;
            data.timestamps.forEach((t: number, i: number) => {
                const dateKey = new Date(t * 1000).toISOString().split('T')[0];
                if (data.prices[i] !== null) {
                    map.set(dateKey, data.prices[i]);
                }
            });
            return map;
        };

        const ibovMap = createPriceMap(ibovData);
        const ifixMap = createPriceMap(ifixData);

        let lastIbovPct = 0;
        let lastIfixPct = 0;

        for (let i = 0; i < timestamps.length; i++) {
            const price = prices[i];
            if (price === null) continue;

            const dateObj = new Date(timestamps[i] * 1000);
            const dateKey = dateObj.toISOString().split('T')[0];
            
            const point: any = {
                date: dateObj.toISOString(),
                timestamp: timestamps[i] * 1000,
                price: price
            };

            // Asset %
            point.assetPct = startPrice > 0 ? ((price - startPrice) / startPrice) * 100 : 0;

            // IBOV %
            if (startIbov > 0) {
                const ibovPrice = ibovMap.get(dateKey);
                if (ibovPrice !== undefined) {
                    point.ibovPct = ((ibovPrice - startIbov) / startIbov) * 100;
                    lastIbovPct = point.ibovPct;
                } else {
                    point.ibovPct = lastIbovPct; // Fill forward
                }
            } else point.ibovPct = 0;

            // IFIX %
            if (startIfix > 0) {
                const ifixPrice = ifixMap.get(dateKey);
                if (ifixPrice !== undefined) {
                    point.ifixPct = ((ifixPrice - startIfix) / startIfix) * 100;
                    lastIfixPct = point.ifixPct;
                } else {
                    point.ifixPct = lastIfixPct; // Fill forward
                }
            } else point.ifixPct = null; // Send null if no data to avoid plotting flat line at 0

            points.push(point);
        }

        return res.status(200).json({
            ticker,
            range,
            points
        });

    } catch (e: any) {
        console.error(`History API Error:`, e.message);
        return res.status(500).json({ error: 'Erro interno' });
    }
}