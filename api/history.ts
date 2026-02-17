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

// Calcula data de início baseada no range para consulta ao BCB
function getStartDate(range: string): Date {
    const now = new Date();
    switch (range) {
        case '1D': return now;
        case '5D': now.setDate(now.getDate() - 10); break;
        case '1M': now.setMonth(now.getMonth() - 2); break;
        case '6M': now.setMonth(now.getMonth() - 7); break;
        case 'YTD': now.setMonth(0, 1); break;
        case '1Y': now.setFullYear(now.getFullYear() - 1); now.setMonth(now.getMonth() - 1); break;
        case '2Y': now.setFullYear(now.getFullYear() - 2); break;
        case '5Y': now.setFullYear(now.getFullYear() - 5); break;
        case 'MAX': now.setFullYear(now.getFullYear() - 10); break;
        default: now.setFullYear(now.getFullYear() - 1);
    }
    return now;
}

const formatDateBCB = (date: Date) => {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
};

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

// Busca série histórica do BCB (CDI ou IPCA)
async function fetchBcbSeries(seriesCode: number, startDate: Date) {
    const startStr = formatDateBCB(startDate);
    const endStr = formatDateBCB(new Date());
    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${seriesCode}/dados?formato=json&dataInicial=${startStr}&dataFinal=${endStr}`;
    
    try {
        const { data } = await axios.get(url, { httpsAgent, timeout: 6000 });
        // Retorna Map: "YYYY-MM-DD" -> valor
        const map = new Map<string, number>();
        if (Array.isArray(data)) {
            data.forEach((item: any) => {
                // item.data é "DD/MM/YYYY"
                const parts = item.data.split('/');
                const isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
                map.set(isoDate, parseFloat(item.valor));
            });
        }
        return map;
    } catch (e) {
        console.warn(`BCB Series ${seriesCode} failed`);
        return new Map<string, number>();
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
        const startDateBCB = getStartDate(range);

        // Fetch Parallel Data
        const [assetData, ibovData, ifixData, cdiMap, ipcaMap] = await Promise.all([
            fetchYahooData(ticker, range),
            fetchYahooData('^BVSP', range),
            fetchYahooData('IFIX.SA', range),
            fetchBcbSeries(12, startDateBCB),  // CDI Diário
            fetchBcbSeries(433, startDateBCB)  // IPCA Mensal
        ]);

        if (!assetData) return res.status(404).json({ error: 'Asset not found' });

        // Maps for O(1) lookup
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

        // Process Data
        const points = [];
        const { timestamps, prices } = assetData;
        
        // Find Start Prices (Base 0%)
        const getStartPrice = (arr: (number|null)[]) => arr.find(p => p !== null && p !== undefined) || 0;
        
        const startPrice = getStartPrice(prices);
        const startIbov = ibovData ? getStartPrice(ibovData.prices) : 0;
        const startIfix = ifixData ? getStartPrice(ifixData.prices) : 0;

        // Cumulative Trackers for BCB
        let accCdi = 1.0;
        let accIpca = 1.0;
        
        // Helpers for fill forward
        let lastIbovPct = 0;
        let lastIfixPct = 0;
        
        // Date tracking for IPCA interpolation
        let previousDateObj: Date | null = null;

        for (let i = 0; i < timestamps.length; i++) {
            const price = prices[i];
            if (price === null) continue;

            const dateObj = new Date(timestamps[i] * 1000);
            const dateKey = dateObj.toISOString().split('T')[0];
            
            // --- CDI ACCUMULATION (Daily) ---
            const cdiRate = cdiMap.get(dateKey);
            if (cdiRate !== undefined) {
                accCdi = accCdi * (1 + (cdiRate / 100));
            } else if (i > 0) {
                // If missing CDI (weekend/holiday in BCB but not in Yahoo?), try to find missed days
                // Simple approach: Assume Yahoo only has trading days. CDI follows trading days too.
                // If mismatch, we just hold value.
            }

            // --- IPCA ACCUMULATION (Interpolated) ---
            // Find month rate
            const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-01`;
            // BCB returns IPCA date as 01/MM/YYYY usually for monthly
            // We need to match YYYY-MM
            // Since we fetched daily map, we need to adapt logic or fetch monthly map logic differently.
            // Let's check map keys. The map keys from fetchBcbSeries are YYYY-MM-DD. 
            // For monthly series 433, dates are 01/MM/YYYY.
            
            // Check if we entered a new month relative to previous point to apply monthly rate? 
            // Better: Apply daily geometric equivalent of the month's rate.
            // Daily IPCA approx = (1 + Monthly%)^(1/21) - 1
            let ipcaDailyFactor = 1.0;
            const monthRate = ipcaMap.get(monthKey); // Try exact 1st of month
            
            // Fallback: try to find any entry for this month if exact 01 doesn't match due to timezone
            // Actually BCB 433 always returns day 01.
            
            if (monthRate !== undefined) {
                // Approx 21 business days
                ipcaDailyFactor = Math.pow(1 + (monthRate / 100), 1 / 21);
            } else {
                // If current month (not released yet), assume a projection (e.g. 0.3% mo) or 0
                // Use prev month rate as proxy or 1.00015 (approx 0.3%)
                ipcaDailyFactor = 1.00015; 
            }
            
            // Apply IPCA only if day changed (Yahoo data is intraday sometimes? No, we requested 1d interval)
            accIpca = accIpca * ipcaDailyFactor;

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
                } else point.ibovPct = lastIbovPct;
            } else point.ibovPct = 0;

            // IFIX %
            if (startIfix > 0) {
                const ifixPrice = ifixMap.get(dateKey);
                if (ifixPrice !== undefined) {
                    point.ifixPct = ((ifixPrice - startIfix) / startIfix) * 100;
                    lastIfixPct = point.ifixPct;
                } else point.ifixPct = lastIfixPct;
            } else point.ifixPct = null;

            // CDI & IPCA % (Based on Accumulation)
            // Normalize to start at 0% at the beginning of the chart (i=0 is 0%)
            // We need to rebase accCdi and accIpca to the first point of THIS chart slice
            // But we are building it sequentially.
            // Wait, accCdi started at 1.0 at start of *data fetching* (which is start of chart approx).
            // But assets might start later.
            // Correct approach: normalization at first VALID asset point.
            
            point.cdiPct = (accCdi - 1) * 100;
            point.ipcaPct = (accIpca - 1) * 100;

            points.push(point);
        }

        // Re-normalize percentage curves to ensure they all start at 0 at the first data point
        if (points.length > 0) {
            const baseCdi = points[0].cdiPct;
            const baseIpca = points[0].ipcaPct;
            
            // Rebase logic: (Current + 100) / (Base + 100) * 100 - 100 ? No, simple subtraction for log returns, 
            // but for simple returns: (CurrentVal / BaseVal - 1). 
            // Our pct is (Val/Start - 1)*100.
            // Val_t = Start * (1 + pct_t/100).
            // NewPct = (Val_t / Val_0 - 1) * 100.
            
            const valCdi0 = 1 + (baseCdi / 100);
            const valIpca0 = 1 + (baseIpca / 100);

            for (const p of points) {
                const valCdi = 1 + (p.cdiPct / 100);
                const valIpca = 1 + (p.ipcaPct / 100);
                
                p.cdiPct = ((valCdi / valCdi0) - 1) * 100;
                p.ipcaPct = ((valIpca / valIpca0) - 1) * 100;
            }
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