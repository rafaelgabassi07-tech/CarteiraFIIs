import { Request, Response } from 'express';
import axios from 'axios';
import https from 'https';

const httpsAgent = new https.Agent({ 
    keepAlive: true,
    maxSockets: 100,
    timeout: 10000,
    rejectUnauthorized: false // Helps with some BCB SSL issues
});

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'X-Requested-With': 'XMLHttpRequest'
};

function getYahooParams(range: string) {
    switch (range) {
        // Intraday
        case '1m': return { range: '1d', interval: '1m' };
        case '5m': return { range: '1d', interval: '5m' };
        case '10m': return { range: '1d', interval: '5m' }; // Yahoo fallback
        case '15m': return { range: '5d', interval: '15m' };
        case '30m': return { range: '5d', interval: '30m' };
        case '1h': return { range: '1mo', interval: '60m' };
        
        // Standard
        case '1d': return { range: '1y', interval: '1d' };
        case '1wk': return { range: '5y', interval: '1wk' };
        case '1mo': return { range: '10y', interval: '1mo' };
        case '3mo': return { range: 'max', interval: '3mo' };
        
        // Legacy / Ranges
        case '1D': return { range: '1d', interval: '5m' };
        case '5D': return { range: '5d', interval: '15m' };
        case '1M': return { range: '1mo', interval: '1d' };
        case '6M': return { range: '6mo', interval: '1d' };
        case 'YTD': return { range: 'ytd', interval: '1d' };
        case '1Y': return { range: '1y', interval: '1d' };
        case '2Y': return { range: '2y', interval: '1wk' };
        case '5Y': return { range: '5y', interval: '1wk' };
        case '10Y': return { range: '10y', interval: '1mo' };
        case 'MAX': return { range: 'max', interval: '1mo' };
        default: return { range: '1y', interval: '1d' };
    }
}

function getInvestidor10Days(range: string): number {
    const r = range.toUpperCase();
    switch (r) {
        case '1D': return 1;
        case '5D': return 5;
        case '1M': return 30;
        case '6M': return 180;
        case 'YTD': return 365; // Approx
        case '1Y': return 365;
        case '2Y': return 730;
        case '5Y': return 1825;
        case '10Y': return 3650;
        case 'MAX': return 36500; // 100 years
        default: return 365;
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
        case '10Y': now.setFullYear(now.getFullYear() - 10); break;
        case 'MAX': now.setFullYear(now.getFullYear() - 15); break;
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

async function fetchInvestidor10History(ticker: string, range: string) {
    const days = getInvestidor10Days(range);
    
    try {
        // 1. Try Stock Endpoint first (most common)
        // Stocks use ticker directly: /api/cotacoes/acao/chart/{ticker}/{days}
        try {
            const stockUrl = `https://investidor10.com.br/api/cotacoes/acao/chart/${ticker}/${days}`;
            const { data } = await axios.get(stockUrl, { headers: HEADERS, httpsAgent, timeout: 5000 });
            if (data && data.real && data.real.length > 0) {
                return parseInvestidor10Data(data.real);
            }
        } catch (e) {
            // Ignore error, try next method
        }

        // 2. Try FII Endpoint
        // FIIs need an ID. We must scrape the FII page to get the ID.
        // Try fetching the FII page
        const fiiPageUrl = `https://investidor10.com.br/fiis/${ticker}/`;
        const { data: pageHtml } = await axios.get(fiiPageUrl, { headers: HEADERS, httpsAgent, timeout: 5000 });
        
        // Extract ID: look for "id: 56" or similar
        const idMatch = pageHtml.match(/id:\s*(\d+)/);
        if (idMatch && idMatch[1]) {
            const id = idMatch[1];
            const fiiUrl = `https://investidor10.com.br/api/fii/cotacoes/chart/${id}/${days}`;
            const { data: fiiData } = await axios.get(fiiUrl, { 
                headers: { ...HEADERS, 'Referer': fiiPageUrl }, 
                httpsAgent, 
                timeout: 5000 
            });
            
            if (fiiData && fiiData.real && fiiData.real.length > 0) {
                return parseInvestidor10Data(fiiData.real);
            }
        }

        return null;
    } catch (e) {
        console.warn(`Investidor10 fetch failed for ${ticker}:`, e);
        return null;
    }
}

function parseInvestidor10Data(data: any[]) {
    const timestamps: number[] = [];
    const prices: number[] = [];
    
    data.forEach((item: any) => {
        // item.created_at format: "DD/MM/YYYY" or "DD/MM/YYYY HH:mm"
        const [datePart, timePart] = item.created_at.split(' ');
        const [day, month, year] = datePart.split('/');
        
        let date = new Date(`${year}-${month}-${day}T00:00:00Z`); // UTC
        if (timePart) {
             // If time exists, it might be intraday, but we usually want daily close
             // For simplicity, treat as daily close
        }
        
        // Adjust for timezone if needed, but UTC date string is safer for charts
        // Actually, we want the timestamp in seconds
        timestamps.push(Math.floor(date.getTime() / 1000));
        prices.push(parseFloat(item.price));
    });

    return {
        timestamps,
        prices,
        opens: prices, // Investidor10 only gives close price usually
        highs: prices,
        lows: prices
    };
}

function normalizeYahooTicker(symbol: string) {
    if (symbol.includes('^')) return symbol;
    if (symbol.includes('.')) return symbol;
    
    // Brazilian stocks/FIIs usually have a number at the end (3, 4, 5, 6, 11, 34)
    // US stocks are usually just letters (AAPL, TSLA)
    if (/[0-9]$/.test(symbol)) {
        return `${symbol}.SA`;
    }
    
    return symbol;
}

async function fetchYahooData(symbol: string, range: string) {
    const s = normalizeYahooTicker(symbol);
    const { range: yRange, interval } = getYahooParams(range);
    
    // Try query2 first, then query1 as fallback
    const endpoints = [
        `https://query2.finance.yahoo.com/v8/finance/chart/${s}?range=${yRange}&interval=${interval}&includePrePost=false`,
        `https://query1.finance.yahoo.com/v8/finance/chart/${s}?range=${yRange}&interval=${interval}&includePrePost=false`
    ];
    
    for (const url of endpoints) {
        try {
            const { data } = await axios.get(url, { 
                httpsAgent, 
                timeout: 8000,
                headers: {
                    ...HEADERS,
                    'Referer': `https://finance.yahoo.com/quote/${s}`,
                    'Origin': 'https://finance.yahoo.com'
                }
            });
            
            const result = data.chart?.result?.[0];
            if (!result || !result.timestamp || !result.indicators.quote[0].close) continue;
            
            const quote = result.indicators.quote[0];

            return {
                timestamps: result.timestamp as number[],
                prices: quote.close as (number | null)[],
                opens: quote.open as (number | null)[],
                highs: quote.high as (number | null)[],
                lows: quote.low as (number | null)[]
            };
        } catch (e: any) {
            console.warn(`Yahoo fetch failed for ${url}:`, e.message);
            // Continue to next endpoint
        }
    }
    return null;
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
        console.warn(`BCB Series ${seriesCode} failed`, e);
        return new Map<string, number>();
    }
}

export async function getHistory(req: Request, res: Response) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const ticker = String(req.query.ticker || '').toUpperCase().trim();
    const range = String(req.query.range || '1Y');

    if (!ticker) return res.status(400).json({ error: 'Ticker required' });

    // Security: Validate ticker format (Alphanumeric + optional suffix + indices like ^BVSP)
    if (!/^[A-Z0-9^]{3,12}(\.[A-Z]{2})?$/.test(ticker)) {
        return res.status(400).json({ error: 'Invalid ticker format' });
    }

    try {
        const startDateBCB = getStartDate(range);

    // Fetch Parallel Data
    // Try Yahoo for intraday ranges, otherwise try Investidor10 first
    let assetData = null;
    const isIntraday = ['1m', '5m', '10m', '15m', '30m', '1h', '1D', '5D'].includes(range);
    
    // Only use Investidor10 for Brazilian assets (no ^ or .SA suffix usually, but user might pass it)
    const cleanTicker = ticker.replace('.SA', '');
    
    if (!isIntraday && !ticker.includes('^')) {
         assetData = await fetchInvestidor10History(cleanTicker, range);
    }
    
    if (!assetData) {
        assetData = await fetchYahooData(ticker, range);
    }

        const [ibovData, ifixData, cdiMap, ipcaMap] = await Promise.all([
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
        const { timestamps, prices, opens, highs, lows } = assetData;
        
        const getFirstValidPrice = (arr: (number|null)[]) => arr ? arr.find(p => p !== null && p !== undefined && p > 0) || 0 : 0;
        
        const startPrice = getFirstValidPrice(prices);
        const startIbov = ibovData ? getFirstValidPrice(ibovData.prices) : 0;
        const startIfix = ifixData ? getFirstValidPrice(ifixData.prices) : 0;

        // Cumulative Trackers for BCB
        let accCdi = 1.0;
        let accIpca = 1.0;
        
        let lastIbovPct = 0;
        let lastIfixPct = 0;
        
        // Fallback rates if BCB fails
        const FALLBACK_CDI_DAILY = 0.00045; // ~12% a.a.
        const FALLBACK_IPCA_MONTHLY = 0.0037; // ~4.5% a.a.
        const useCdiFallback = cdiMap.size === 0;
        const useIpcaFallback = ipcaMap.size === 0;

        for (let i = 0; i < timestamps.length; i++) {
            const price = prices[i];
            
            // Pula pontos nulos do ativo principal
            if (price === null) continue;

            const dateObj = new Date(timestamps[i] * 1000);
            const dateKey = dateObj.toISOString().split('T')[0];
            
            // --- CDI ACCUMULATION (Daily) ---
            let cdiRate = cdiMap.get(dateKey);
            
            // Tenta pegar do dia anterior se não achar (timezone/weekend diff)
            if (cdiRate === undefined) {
                const prevDate = new Date(dateObj);
                prevDate.setDate(prevDate.getDate() - 1);
                cdiRate = cdiMap.get(prevDate.toISOString().split('T')[0]);
            }

            if (cdiRate !== undefined) {
                accCdi = accCdi * (1 + (cdiRate / 100));
            } else if (useCdiFallback) {
                // Aplica fallback apenas em dias úteis (simplificado: não fds)
                const day = dateObj.getDay();
                if (day !== 0 && day !== 6) {
                    accCdi = accCdi * (1 + FALLBACK_CDI_DAILY);
                }
            }

            // --- IPCA ACCUMULATION (Interpolated) ---
            const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-01`;
            const monthRate = ipcaMap.get(monthKey);
            let ipcaDailyFactor = 1 + (FALLBACK_IPCA_MONTHLY / 21); 
            
            if (monthRate !== undefined) {
                ipcaDailyFactor = Math.pow(1 + (monthRate / 100), 1 / 21);
            }
            accIpca = accIpca * ipcaDailyFactor;

            const point: any = {
                date: dateObj.toISOString(),
                timestamp: timestamps[i] * 1000,
                price: price,
                open: opens ? opens[i] : price,
                high: highs ? highs[i] : price,
                low: lows ? lows[i] : price,
                close: price
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

            // CDI & IPCA %
            point.cdiPct = (accCdi - 1) * 100;
            point.ipcaPct = (accIpca - 1) * 100;

            points.push(point);
        }

        // Re-normalize percentage curves
        if (points.length > 0) {
            const baseCdi = points[0].cdiPct;
            const baseIpca = points[0].ipcaPct;
            const baseIbov = points[0].ibovPct;
            const baseIfix = points[0].ifixPct || 0;
            
            const valCdi0 = 1 + (baseCdi / 100);
            const valIpca0 = 1 + (baseIpca / 100);
            const valIbov0 = 1 + (baseIbov / 100);
            const valIfix0 = 1 + (baseIfix / 100);

            for (const p of points) {
                const valCdi = 1 + (p.cdiPct / 100);
                const valIpca = 1 + (p.ipcaPct / 100);
                const valIbov = 1 + (p.ibovPct / 100);
                
                p.cdiPct = ((valCdi / valCdi0) - 1) * 100;
                p.ipcaPct = ((valIpca / valIpca0) - 1) * 100;
                p.ibovPct = ((valIbov / valIbov0) - 1) * 100;
                
                if (p.ifixPct !== null) {
                    const valIfix = 1 + (p.ifixPct / 100);
                    p.ifixPct = ((valIfix / valIfix0) - 1) * 100;
                }
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
