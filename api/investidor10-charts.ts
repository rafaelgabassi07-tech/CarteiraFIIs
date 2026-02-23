
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
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'X-Requested-With': 'XMLHttpRequest'
};

async function getIds(ticker: string, type: string) {
    const url = `https://investidor10.com.br/${type}/${ticker.toLowerCase()}/`;
    try {
        const { data } = await axios.get(url, { headers: HEADERS, httpsAgent });
        
        const idMatch = data.match(/id:\s*(\d+)/);
        const companyIdMatch = data.match(/companyId:\s*['"]?(\d+)['"]?/) || data.match(/company_id:\s*['"]?(\d+)['"]?/);
        const tickerIdMatch = data.match(/tickerId:\s*['"]?(\d+)['"]?/) || data.match(/ticker_id:\s*['"]?(\d+)['"]?/);
        
        // Also look for the revenue/equity ID which is often different or same as companyId
        const revenueMatch = data.match(/\/api\/balancos\/receitaliquida\/chart\/(\d+)\//);
        const equityMatch = data.match(/\/api\/balancos\/ativospassivos\/chart\/(\d+)\//);

        return {
            id: idMatch ? idMatch[1] : null,
            companyId: companyIdMatch ? companyIdMatch[1] : (revenueMatch ? revenueMatch[1] : null),
            tickerId: tickerIdMatch ? tickerIdMatch[1] : (idMatch ? idMatch[1] : null),
            revenueId: revenueMatch ? revenueMatch[1] : (companyIdMatch ? companyIdMatch[1] : null)
        };
    } catch (e) {
        return null;
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { ticker, chartType, assetType } = req.query;
    if (!ticker || !chartType) return res.status(400).json({ error: 'Ticker and chartType required' });

    const t = String(ticker).toUpperCase();
    const type = String(assetType || (t.endsWith('11') ? 'fiis' : 'acoes')).toLowerCase();
    const isFii = type === 'fiis';
    
    try {
        let url = '';
        const ids = await getIds(t, type);
        if (!ids) return res.status(404).json({ error: 'Could not find IDs for ticker' });

        if (chartType === 'profit_price') {
            if (isFii) {
                url = `https://investidor10.com.br/api/fii/cotacoes/chart/${ids.id}/3650/`;
            } else {
                url = `https://investidor10.com.br/api/cotacao-lucro/${t}/adjusted/`;
            }
        } else {
            switch (chartType) {
                case 'revenue_profit':
                    if (isFii) {
                        url = `https://investidor10.com.br/api/fii/dividendos/chart/${ids.id}/3650/`;
                    } else {
                        if (!ids.revenueId) return res.status(404).json({ error: 'Revenue ID not found' });
                        url = `https://investidor10.com.br/api/balancos/receitaliquida/chart/${ids.revenueId}/3650/false/`;
                    }
                    break;
                case 'equity':
                    if (isFii) {
                        url = `https://investidor10.com.br/api/fii/valor-patrimonial/chart/${ids.id}/3650/`;
                    } else {
                        if (!ids.revenueId) return res.status(404).json({ error: 'Equity ID not found' });
                        url = `https://investidor10.com.br/api/balancos/ativospassivos/chart/${ids.revenueId}/3650/`;
                    }
                    break;
                case 'payout':
                    if (isFii) {
                        url = `https://investidor10.com.br/api/fii/dividend-yield/chart/${ids.id}/3650/`;
                    } else {
                        if (!ids.companyId || !ids.tickerId) return res.status(404).json({ error: 'Payout IDs not found' });
                        url = `https://investidor10.com.br/api/acoes/payout-chart/${ids.companyId}/${ids.tickerId}/${t}/365`;
                    }
                    break;
                default:
                    return res.status(400).json({ error: 'Invalid chartType' });
            }
        }

        const response = await axios.get(url, { 
            headers: { 
                ...HEADERS,
                'Referer': `https://investidor10.com.br/${type}/${t.toLowerCase()}/`
            }, 
            httpsAgent 
        });
        
        let transformedData = response.data;

        // Transform data based on chartType and assetType
        if (isFii) {
            if (chartType === 'profit_price') {
                // FII cotacoes returns { real: [...], dolar: [...], euro: [...] }
                const points = response.data.real || [];
                transformedData = points.map((item: any) => ({
                    label: item.created_at.split('/').slice(1).join('/'), // MM/YYYY
                    price: item.price,
                    profit: 0 // FIIs don't have a simple profit line in this chart
                }));
            } else if (chartType === 'revenue_profit') {
                // FII dividendos returns [{ price: 0.87, created_at: '02/2016' }, ...]
                transformedData = response.data.map((item: any) => ({
                    label: item.created_at,
                    revenue: item.price, // Using dividend as proxy for income
                    profit: item.price
                }));
            } else if (chartType === 'equity') {
                transformedData = response.data.map((item: any) => ({
                    label: item.created_at,
                    equity: item.price
                }));
            } else if (chartType === 'payout') {
                transformedData = response.data.map((item: any) => ({
                    label: item.created_at,
                    dy: item.price
                }));
            }
        } else {
            // Transform data for Stocks
            if (chartType === 'revenue_profit') {
                const arr = Array.isArray(response.data) ? response.data : Object.values(response.data);
                transformedData = arr.map((item: any) => ({
                    label: `${item.quarter}T${item.year}`,
                    revenue: item.net_revenue,
                    profit: item.net_profit
                }));
            } else if (chartType === 'equity') {
                const arr = Array.isArray(response.data) ? response.data : Object.values(response.data);
                transformedData = arr.map((item: any) => ({
                    label: `${item.quarter}T${item.year}`,
                    equity: item.net_worth,
                    revenue: item.net_revenue,
                    profit: item.net_profit
                }));
            } else if (chartType === 'profit_price') {
                transformedData = Object.entries(response.data).map(([year, val]: [string, any]) => ({
                    label: year,
                    profit: val.net_profit,
                    price: parseFloat(val.quotation)
                }));
            } else if (chartType === 'payout') {
                const years = response.data.years || [];
                const payoutMap = response.data.payOutCompanyIndicators || {};
                const dyMap = response.data.dyTickerIndicators || {};
                
                transformedData = years.map((year: string, idx: number) => {
                    const payoutEntry = Object.values(payoutMap).find((v: any) => v.year === year) as any;
                    const dyEntry = Object.values(dyMap).find((v: any) => v.year === year) as any;
                    
                    return {
                        label: year,
                        payout: payoutEntry ? payoutEntry.value : 0,
                        dy: dyEntry ? parseFloat(dyEntry.value) : 0
                    };
                });
            }
        }
        
        return res.status(200).json(transformedData);

    } catch (e: any) {
        console.error(`Proxy Error:`, e.message);
        return res.status(500).json({ error: 'Failed to fetch chart data' });
    }
}
