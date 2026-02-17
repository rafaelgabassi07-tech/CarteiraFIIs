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
    const benchmark = String(req.query.benchmark || '').toUpperCase().trim();
    const range = String(req.query.range || '1Y');

    if (!ticker) return res.status(400).json({ error: 'Ticker required' });

    try {
        // Fetch Asset Data
        const assetData = await fetchYahooData(ticker, range);
        if (!assetData) return res.status(404).json({ error: 'Asset not found' });

        // Fetch Benchmark Data (if requested)
        let benchData = null;
        if (benchmark) {
            benchData = await fetchYahooData(benchmark, range);
        }

        // Process Data
        const points = [];
        const { timestamps, prices } = assetData;
        
        // Find first valid price for normalization
        let startPrice = 0;
        let startBenchPrice = 0;

        for (let i = 0; i < prices.length; i++) {
            if (prices[i] !== null) {
                startPrice = prices[i] as number;
                break;
            }
        }

        // Setup benchmark start price if available
        if (benchData) {
            for (let i = 0; i < benchData.prices.length; i++) {
                if (benchData.prices[i] !== null) {
                    startBenchPrice = benchData.prices[i] as number;
                    break;
                }
            }
        }

        // Create Map for Benchmark Data to sync dates (Yahoo returns different timestamps for different tickers)
        const benchMap = new Map<string, number>();
        if (benchData) {
            benchData.timestamps.forEach((t, i) => {
                const dateKey = new Date(t * 1000).toISOString().split('T')[0];
                if (benchData!.prices[i] !== null) {
                    benchMap.set(dateKey, benchData!.prices[i] as number);
                }
            });
        }

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

            // Calculate Asset Percentage Change
            if (startPrice > 0) {
                point.assetPct = ((price - startPrice) / startPrice) * 100;
            } else {
                point.assetPct = 0;
            }

            // Calculate Benchmark Percentage Change (Syncing by Date)
            if (benchmark && startBenchPrice > 0) {
                const benchPrice = benchMap.get(dateKey);
                // If exact date not found, try to find nearest previous date (simple fill forward)
                // For simplicity in this demo, we skip if exact date missing or reuse previous
                if (benchPrice !== undefined) {
                    point.benchPct = ((benchPrice - startBenchPrice) / startBenchPrice) * 100;
                } else if (points.length > 0) {
                    point.benchPct = points[points.length - 1].benchPct;
                } else {
                    point.benchPct = 0;
                }
            }

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