import { Request, Response } from 'express';
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

export async function getInvestidor10Data(req: Request, res: Response) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const { ticker } = req.query;
    if (!ticker) return res.status(400).json({ error: 'Ticker required' });

    const t = String(ticker).toUpperCase();
    const type = (t.endsWith('11') || t.endsWith('11B')) ? 'fiis' : 'acoes';
    const isFii = type === 'fiis';
    
    try {
        const ids = await getIds(t, type);
        if (!ids) return res.status(404).json({ error: 'Could not find IDs for ticker' });

        // URLs para buscar
        const requests: Record<string, string> = {};

        if (isFii) {
            // FIIs
            requests.payout = `https://investidor10.com.br/api/fii/dividend-yield/chart/${ids.id}/3650/`;
            requests.dividends = `https://investidor10.com.br/api/fii/dividendos/chart/${ids.id}/3650/`; // Usado para "net_worth" (proventos)
            requests.equity = `https://investidor10.com.br/api/fii/valor-patrimonial/chart/${ids.id}/3650/`;
        } else {
            // Ações
            if (ids.revenueId) {
                requests.revenue = `https://investidor10.com.br/api/balancos/receitaliquida/chart/${ids.revenueId}/3650/false/`;
                requests.equity = `https://investidor10.com.br/api/balancos/ativospassivos/chart/${ids.revenueId}/3650/`;
            }
            if (ids.companyId && ids.tickerId) {
                requests.payout = `https://investidor10.com.br/api/acoes/payout-chart/${ids.companyId}/${ids.tickerId}/${t}/365`;
            }
        }

        // Executar requisições em paralelo
        const results: Record<string, any> = {};
        await Promise.all(Object.entries(requests).map(async ([key, url]) => {
            try {
                const { data } = await axios.get(url, { 
                    headers: { ...HEADERS, 'Referer': `https://investidor10.com.br/${type}/${t.toLowerCase()}/` }, 
                    httpsAgent 
                });
                results[key] = data;
            } catch (e) {
                console.error(`Failed to fetch ${key} for ${t}`);
                results[key] = null;
            }
        }));

        // Transformar dados para o formato esperado pelo frontend
        const responseData: any = {
            net_profit: [],
            payout_dy: [],
            net_worth: []
        };

        if (isFii) {
            // FII Transformation
            
            // Payout & DY
            if (results.payout) {
                responseData.payout_dy = results.payout.map((item: any) => ({
                    label: item.created_at,
                    dy: item.price,
                    payout: 0 // FIIs geralmente distribuem 95%, mas a API não retorna payout explícito aqui
                }));
            }

            // Net Worth (Frontend usa para "Proventos" em FIIs)
            // barKey: 'rendimento', areaKey: 'cotas'
            // Vamos usar 'dividends' para rendimento
            if (results.dividends) {
                responseData.net_worth = results.dividends.map((item: any) => ({
                    label: item.created_at,
                    rendimento: item.price,
                    cotas: 0 // Não temos valor da cota histórico aqui facilmente, ou teríamos que buscar outro endpoint
                }));
            }
            
            // FIIs não têm "net_profit" (Receitas e Lucros) da mesma forma que ações no frontend
            
        } else {
            // Stocks Transformation

            // Net Profit (Receita e Lucro)
            if (results.revenue) {
                const arr = Array.isArray(results.revenue) ? results.revenue : Object.values(results.revenue);
                responseData.net_profit = arr.map((item: any) => ({
                    label: `${item.quarter}T${item.year}`,
                    receitaLiquida: item.net_revenue,
                    lucroLiquido: item.net_profit
                }));
            }

            // Net Worth (Patrimônio)
            if (results.equity) {
                const arr = Array.isArray(results.equity) ? results.equity : Object.values(results.equity);
                responseData.net_worth = arr.map((item: any) => ({
                    label: `${item.quarter}T${item.year}`,
                    patrimonioLiquido: item.net_worth,
                    cotas: 0 // Não usado para ações
                }));
            }

            // Payout & DY
            if (results.payout) {
                const years = results.payout.years || [];
                const payoutMap = results.payout.payOutCompanyIndicators || {};
                const dyMap = results.payout.dyTickerIndicators || {};
                
                responseData.payout_dy = years.map((year: string) => {
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

        return res.status(200).json(responseData);

    } catch (e: any) {
        console.error(`Investidor10 Controller Error:`, e.message);
        return res.status(500).json({ error: 'Failed to fetch data' });
    }
}
