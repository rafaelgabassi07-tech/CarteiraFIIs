
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import https from 'https';

const httpsAgent = new https.Agent({ 
    keepAlive: true,
    maxSockets: 100,
    timeout: 15000 
});

function getYahooParams(range: string) {
    switch (range) {
        case '1M': return { range: '1mo', interval: '1d' };
        case '6M': return { range: '6mo', interval: '1d' };
        case '1Y': return { range: '1y', interval: '1d' };
        case '2Y': return { range: '2y', interval: '1wk' };
        case '5Y': return { range: '5y', interval: '1mo' };
        case '10Y': return { range: '10y', interval: '1mo' };
        default: return { range: '1y', interval: '1d' };
    }
}

// Determina o benchmark baseado no ticker
function getBenchmark(ticker: string) {
    if (ticker.endsWith('11') || ticker.endsWith('11B')) return 'IFIX.SA'; // FIIs -> IFIX
    if (ticker.startsWith('^')) return null; // Já é um índice
    return '^BVSP'; // Ações -> IBOVESPA
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=1800');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const ticker = String(req.query.ticker || '').toUpperCase().trim();
    const range = String(req.query.range || '1Y');
    const compare = req.query.compare === 'true';

    if (!ticker) return res.status(400).json({ error: 'Ticker required' });

    try {
        const symbol = ticker.endsWith('.SA') || ticker.startsWith('^') ? ticker : `${ticker}.SA`;
        const benchmark = getBenchmark(ticker);
        const { range: yRange, interval } = getYahooParams(range);

        // URLs
        const urlAsset = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${yRange}&interval=${interval}&includePrePost=false`;
        
        const promises = [axios.get(urlAsset, { httpsAgent, timeout: 8000 })];
        
        if (compare && benchmark) {
            const urlBench = `https://query1.finance.yahoo.com/v8/finance/chart/${benchmark}?range=${yRange}&interval=${interval}&includePrePost=false`;
            promises.push(axios.get(urlBench, { httpsAgent, timeout: 8000 }));
        }

        const responses = await Promise.allSettled(promises);

        // Processa Ativo Principal
        const assetRes = responses[0].status === 'fulfilled' ? responses[0].value.data : null;
        if (!assetRes || !assetRes.chart?.result?.[0]?.timestamp) {
            return res.status(404).json({ error: 'Dados do ativo não encontrados' });
        }

        const assetTimestamps = assetRes.chart.result[0].timestamp;
        const assetQuotes = assetRes.chart.result[0].indicators.quote[0].close;
        const assetStartPrice = assetQuotes.find((p: number) => p !== null && p > 0) || 0;

        // Processa Benchmark (se houver)
        let benchData: Record<string, number> = {};
        let benchStartPrice = 0;
        let benchmarkName = benchmark === '^BVSP' ? 'IBOV' : 'IFIX';

        if (compare && benchmark && responses[1].status === 'fulfilled') {
            const benchRes = responses[1].value.data;
            if (benchRes.chart?.result?.[0]?.timestamp) {
                const bTimestamps = benchRes.chart.result[0].timestamp;
                const bQuotes = benchRes.chart.result[0].indicators.quote[0].close;
                
                benchStartPrice = bQuotes.find((p: number) => p !== null && p > 0) || 0;

                // Cria mapa de data -> preço para alinhar
                bTimestamps.forEach((t: number, i: number) => {
                    if (bQuotes[i]) {
                        // Arredonda timestamp para dia (evita micro-desalinhamentos)
                        const dateKey = new Date(t * 1000).toISOString().split('T')[0];
                        benchData[dateKey] = bQuotes[i];
                    }
                });
            }
        }

        // Combina e Normaliza (Base 0%)
        const points = assetTimestamps.map((t: number, i: number) => {
            const assetPrice = assetQuotes[i];
            if (assetPrice === null || assetPrice === undefined) return null;

            const dateObj = new Date(t * 1000);
            const dateKey = dateObj.toISOString().split('T')[0];
            const dateIso = dateObj.toISOString();

            // Variação % do Ativo
            const assetChange = assetStartPrice > 0 ? ((assetPrice - assetStartPrice) / assetStartPrice) * 100 : 0;

            const point: any = {
                date: dateIso,
                timestamp: t * 1000,
                price: assetPrice,
                assetChange: Number(assetChange.toFixed(2))
            };

            // Adiciona Benchmark se disponível
            if (compare && benchStartPrice > 0) {
                // Tenta achar preço do benchmark na mesma data (ou dia próximo)
                const benchPrice = benchData[dateKey];
                if (benchPrice) {
                    const benchChange = ((benchPrice - benchStartPrice) / benchStartPrice) * 100;
                    point.benchmarkPrice = benchPrice;
                    point.benchmarkChange = Number(benchChange.toFixed(2));
                }
            }

            return point;
        }).filter((p: any) => p !== null);

        // Preenchimento de lacunas (forward fill) para benchmark se necessário
        let lastBench = 0;
        points.forEach((p: any) => {
            if (p.benchmarkChange !== undefined) lastBench = p.benchmarkChange;
            else if (compare && benchStartPrice > 0) p.benchmarkChange = lastBench;
        });

        return res.status(200).json({
            ticker,
            range,
            benchmark: compare ? benchmarkName : null,
            startPrice: assetStartPrice,
            points
        });

    } catch (e: any) {
        console.error(`History API Error (${ticker}):`, e.message);
        return res.status(500).json({ error: 'Erro ao processar histórico' });
    }
}
