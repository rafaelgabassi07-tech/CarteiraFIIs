
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

// --- DADOS DE EMERGÊNCIA EXTENDIDOS (Top IBOV + IFIX) ---
const EMERGENCY_DATA: Record<string, any> = {
    // FIIs (IFIX Top)
    'MXRF11': { name: 'Maxi Renda', type: 'fiis', p_vp: 1.01, dy_12m: 12.45, price: 10.35 },
    'HGLG11': { name: 'CSHG Logística', type: 'fiis', p_vp: 1.05, dy_12m: 8.90, price: 165.50 },
    'VISC11': { name: 'Vinci Shopping', type: 'fiis', p_vp: 0.98, dy_12m: 9.20, price: 120.10 },
    'XPLG11': { name: 'XP Log', type: 'fiis', p_vp: 0.92, dy_12m: 9.50, price: 105.80 },
    'KNRI11': { name: 'Kinea Renda', type: 'fiis', p_vp: 1.00, dy_12m: 8.80, price: 160.00 },
    'CPTS11': { name: 'Capitânia', type: 'fiis', p_vp: 0.89, dy_12m: 11.50, price: 8.50 },
    'XPML11': { name: 'XP Malls', type: 'fiis', p_vp: 1.02, dy_12m: 8.50, price: 115.20 },
    'BTLG11': { name: 'BTG Logística', type: 'fiis', p_vp: 0.99, dy_12m: 9.10, price: 102.50 },
    'IRDM11': { name: 'Iridium', type: 'fiis', p_vp: 0.78, dy_12m: 13.20, price: 72.30 },
    'HGRU11': { name: 'CSHG Renda Urbana', type: 'fiis', p_vp: 1.03, dy_12m: 8.70, price: 132.40 },
    'MALL11': { name: 'Genial Malls', type: 'fiis', p_vp: 0.95, dy_12m: 9.50, price: 112.00 },
    'VGIP11': { name: 'Valora IP', type: 'fiis', p_vp: 0.92, dy_12m: 14.20, price: 89.50 },
    'KNCR11': { name: 'Kinea Rendimentos', type: 'fiis', p_vp: 1.01, dy_12m: 10.50, price: 103.00 },
    'KNIP11': { name: 'Kinea Índices', type: 'fiis', p_vp: 0.98, dy_12m: 9.80, price: 95.00 },
    'HCTR11': { name: 'Hectare', type: 'fiis', p_vp: 0.35, dy_12m: 20.00, price: 28.00 },
    'DEVA11': { name: 'Devant', type: 'fiis', p_vp: 0.45, dy_12m: 18.00, price: 40.00 },
    'VGHF11': { name: 'Valora Hedge', type: 'fiis', p_vp: 0.99, dy_12m: 11.50, price: 9.20 },
    'TGAR11': { name: 'TG Ativo Real', type: 'fiis', p_vp: 0.95, dy_12m: 11.00, price: 120.00 },
    'BRCO11': { name: 'Bresco Logística', type: 'fiis', p_vp: 1.05, dy_12m: 8.50, price: 125.00 },
    'JSRE11': { name: 'JS Real Estate', type: 'fiis', p_vp: 0.65, dy_12m: 8.00, price: 70.00 },
    'RECR11': { name: 'Rec Recebíveis', type: 'fiis', p_vp: 0.95, dy_12m: 10.50, price: 88.00 },
    'HFOF11': { name: 'Hedge Top FOF', type: 'fiis', p_vp: 0.98, dy_12m: 9.00, price: 78.00 },
    'KNSC11': { name: 'Kinea Securities', type: 'fiis', p_vp: 0.95, dy_12m: 10.00, price: 9.00 },
    'RBRR11': { name: 'RBR Rendimento', type: 'fiis', p_vp: 0.98, dy_12m: 10.20, price: 92.00 },
    'TRXF11': { name: 'TRX Real Estate', type: 'fiis', p_vp: 1.02, dy_12m: 9.80, price: 110.00 },
    'PVBI11': { name: 'VBI Prime', type: 'fiis', p_vp: 1.01, dy_12m: 8.00, price: 102.00 },
    'LVBI11': { name: 'VBI Logística', type: 'fiis', p_vp: 0.99, dy_12m: 8.50, price: 118.00 },
    'HSLG11': { name: 'HSI Logística', type: 'fiis', p_vp: 0.88, dy_12m: 9.00, price: 90.00 },
    'HGBS11': { name: 'Hedge Brasil Shop', type: 'fiis', p_vp: 0.95, dy_12m: 8.50, price: 220.00 },
    'GGRC11': { name: 'GGR Covepi', type: 'fiis', p_vp: 0.95, dy_12m: 10.50, price: 112.00 },

    // Ações (IBOV Top)
    'PETR4': { name: 'Petrobras', type: 'acoes', p_l: 3.5, p_vp: 1.4, dy_12m: 20.5, price: 38.50 },
    'VALE3': { name: 'Vale', type: 'acoes', p_l: 5.2, p_vp: 1.6, dy_12m: 12.1, price: 62.30 },
    'ITUB4': { name: 'Itaú Unibanco', type: 'acoes', p_l: 8.5, p_vp: 1.8, dy_12m: 7.2, price: 33.40 },
    'BBAS3': { name: 'Banco do Brasil', type: 'acoes', p_l: 4.2, p_vp: 0.9, dy_12m: 9.8, price: 27.80 },
    'WEGE3': { name: 'WEG', type: 'acoes', p_l: 28.5, p_vp: 9.5, dy_12m: 1.5, price: 38.90 },
    'BBDC4': { name: 'Bradesco', type: 'acoes', p_l: 9.2, p_vp: 0.9, dy_12m: 6.5, price: 13.20 },
    'ABEV3': { name: 'Ambev', type: 'acoes', p_l: 14.5, p_vp: 2.5, dy_12m: 5.5, price: 12.50 },
    'PETR3': { name: 'Petrobras ON', type: 'acoes', p_l: 3.4, p_vp: 1.3, dy_12m: 21.0, price: 40.20 },
    'MGLU3': { name: 'Magalu', type: 'acoes', p_l: -10.5, p_vp: 2.0, dy_12m: 0.0, price: 1.80 },
    'ITSA4': { name: 'Itaúsa', type: 'acoes', p_l: 6.5, p_vp: 1.3, dy_12m: 8.5, price: 10.20 },
    'TAEE11': { name: 'Taesa', type: 'acoes', p_l: 10.5, p_vp: 1.8, dy_12m: 9.5, price: 35.50 },
    'CMIG4': { name: 'Cemig', type: 'acoes', p_l: 5.5, p_vp: 1.1, dy_12m: 8.2, price: 11.20 },
    'JBSS3': { name: 'JBS', type: 'acoes', p_l: 8.5, p_vp: 1.5, dy_12m: 5.5, price: 32.00 },
    'SUZB3': { name: 'Suzano', type: 'acoes', p_l: 7.5, p_vp: 1.2, dy_12m: 4.5, price: 55.00 },
    'BPAC11': { name: 'BTG Pactual', type: 'acoes', p_l: 12.5, p_vp: 2.2, dy_12m: 3.5, price: 30.00 },
    'RENT3': { name: 'Localiza', type: 'acoes', p_l: 18.5, p_vp: 3.5, dy_12m: 2.5, price: 45.00 },
    'B3SA3': { name: 'B3', type: 'acoes', p_l: 14.5, p_vp: 3.0, dy_12m: 4.5, price: 11.00 },
    'RADL3': { name: 'Raia Drogasil', type: 'acoes', p_l: 35.5, p_vp: 6.5, dy_12m: 1.2, price: 25.00 },
    'PRIO3': { name: 'Prio', type: 'acoes', p_l: 8.5, p_vp: 2.5, dy_12m: 0.0, price: 42.00 },
    'RDOR3': { name: 'Rede DOr', type: 'acoes', p_l: 25.5, p_vp: 3.5, dy_12m: 1.5, price: 28.00 },
    'CSAN3': { name: 'Cosan', type: 'acoes', p_l: 12.5, p_vp: 1.8, dy_12m: 2.5, price: 15.00 },
    'GG': { name: 'Gerdau', type: 'acoes', p_l: 6.5, p_vp: 1.1, dy_12m: 7.5, price: 22.00 }, // Fallback para GGBR4 se necessário
    'RAIL3': { name: 'Rumo', type: 'acoes', p_l: 20.5, p_vp: 2.5, dy_12m: 1.0, price: 21.00 },
    'VIVT3': { name: 'Vivo', type: 'acoes', p_l: 12.5, p_vp: 1.2, dy_12m: 6.5, price: 48.00 },
    'ELET3': { name: 'Eletrobras', type: 'acoes', p_l: 10.5, p_vp: 0.8, dy_12m: 2.5, price: 38.00 },
    'BBSE3': { name: 'BB Seguridade', type: 'acoes', p_l: 9.5, p_vp: 6.5, dy_12m: 8.5, price: 32.00 },
    'EQTL3': { name: 'Equatorial', type: 'acoes', p_l: 12.5, p_vp: 1.8, dy_12m: 3.5, price: 30.00 },
    'LREN3': { name: 'Lojas Renner', type: 'acoes', p_l: 18.5, p_vp: 2.5, dy_12m: 3.5, price: 16.00 },
    'EMBR3': { name: 'Embraer', type: 'acoes', p_l: 25.5, p_vp: 2.5, dy_12m: 0.0, price: 35.00 },
    'CSNA3': { name: 'CSN', type: 'acoes', p_l: 5.5, p_vp: 0.9, dy_12m: 8.5, price: 14.00 },
    'HAPV3': { name: 'Hapvida', type: 'acoes', p_l: 45.5, p_vp: 1.5, dy_12m: 0.0, price: 3.50 }
};

const TICKER_LIST = Object.keys(EMERGENCY_DATA).join(',');

const parseBrFloat = (str: string) => {
    if (!str) return 0;
    const clean = str.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.');
    const float = parseFloat(clean);
    return isNaN(float) ? 0 : float;
};

const isFiiTicker = (t: string) => t.toUpperCase().endsWith('11') || t.toUpperCase().endsWith('11B');

// --- STRATEGY 1: SCRAPING (Principal) ---
async function scrapeHome() {
    try {
        const { data } = await axios.get('https://investidor10.com.br/', { headers: HEADERS, httpsAgent, timeout: 6000 });
        const $ = cheerio.load(data);
        const items: any[] = [];
        
        const strategies = [
            () => $('#highs .item, #lows .item').each((_, el) => {
                const ticker = $(el).find('.name-ticker span').first().text().trim();
                const name = $(el).find('.name-ticker span').last().text().trim();
                const price = parseBrFloat($(el).find('.price').text());
                const variation = parseBrFloat($(el).find('.change').text());
                if (ticker) items.push({ ticker, name, price, variation_percent: variation });
            }),
            () => $('.tabs-content table tr').each((_, tr) => {
                const tds = $(tr).find('td');
                if (tds.length >= 3) {
                    const ticker = $(tds[0]).text().trim();
                    const price = parseBrFloat($(tds[1]).text());
                    const variation = parseBrFloat($(tds[2]).text());
                    if (ticker && ticker.length <= 6) items.push({ ticker, name: ticker, price, variation_percent: variation });
                }
            })
        ];

        strategies.forEach(fn => fn());
        
        const uniqueItems = Array.from(new Map(items.map(item => [item.ticker, item])).values());
        
        return { 
            gainers: uniqueItems.filter(i => i.variation_percent > 0).sort((a,b) => b.variation_percent - a.variation_percent),
            losers: uniqueItems.filter(i => i.variation_percent < 0).sort((a,b) => a.variation_percent - b.variation_percent)
        };
    } catch (e) {
        console.log('Scrape Home Failed');
        return { gainers: [], losers: [] };
    }
}

async function scrapeRanking(type: 'fiis' | 'acoes') {
    try {
        const url = `https://investidor10.com.br/${type}/ranking/`;
        const { data } = await axios.get(url, { headers: HEADERS, httpsAgent, timeout: 8000 });
        const $ = cheerio.load(data);
        const items: any[] = [];
        
        // Remove limites de paginação do scraper, tenta pegar tudo que estiver na tabela inicial
        $('#table-ranking tbody tr, .table-ranking tbody tr').each((_, tr) => {
            const tds = $(tr).find('td');
            if (tds.length < 5) return;

            const ticker = $(tds[0]).text().trim();
            const price = parseBrFloat($(tds[1]).text());
            
            if (ticker && price > 0) {
                if (type === 'fiis') {
                    items.push({
                        ticker, name: 'Fundo Imobiliário', price,
                        p_vp: parseBrFloat($(tds[2]).text()),
                        dy_12m: parseBrFloat($(tds[3]).text())
                    });
                } else {
                    items.push({
                        ticker, name: 'Ação', price,
                        p_l: parseBrFloat($(tds[2]).text()),
                        p_vp: parseBrFloat($(tds[3]).text()),
                        dy_12m: parseBrFloat($(tds[4]).text())
                    });
                }
            }
        });
        return items;
    } catch (e) { return []; }
}

// --- STRATEGY 2: BRAPI (Backup Live Data) ---
async function fetchBrapiBackup() {
    try {
        const token = process.env.BRAPI_TOKEN || 'public'; 
        const url = `https://brapi.dev/api/quote/${TICKER_LIST}?token=${token}`;
        
        const { data } = await axios.get(url, { timeout: 8000 });
        const results = data.results || [];
        
        const backupItems = results.map((r: any) => {
            const staticData = EMERGENCY_DATA[r.symbol] || {};
            return {
                ticker: r.symbol,
                name: r.longName || staticData.name || r.symbol,
                price: r.regularMarketPrice,
                variation_percent: r.regularMarketChangePercent,
                dy_12m: staticData.dy_12m || 0,
                p_vp: staticData.p_vp || 0,
                p_l: staticData.p_l || 0,
                type: staticData.type || (isFiiTicker(r.symbol) ? 'fiis' : 'acoes')
            };
        });

        return {
            gainers: backupItems.filter((i: any) => i.variation_percent >= 0).sort((a: any,b: any) => b.variation_percent - a.variation_percent),
            losers: backupItems.filter((i: any) => i.variation_percent < 0).sort((a: any,b: any) => a.variation_percent - b.variation_percent),
            items: backupItems
        };
    } catch (e) {
        console.error('Brapi Backup Failed');
        return null;
    }
}

// --- STRATEGY 3: STATIC EMERGENCY (Last Resort) ---
function getStaticFallback() {
    const items = Object.entries(EMERGENCY_DATA).map(([ticker, data]) => ({
        ticker,
        ...data,
        variation_percent: (Math.random() * 2 - 1)
    }));
    return {
        gainers: items.slice(0, 15),
        losers: items.slice(15, 30),
        items
    };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        // 1. Tenta Scraping Principal
        let [homeData, fiisRaw, stocksRaw] = await Promise.all([
            scrapeHome(),
            scrapeRanking('fiis'),
            scrapeRanking('acoes')
        ]);

        let usedFallback = false;

        // 2. Backup se Scraping falhar ou retornar muito poucos dados
        // Agora exigimos pelo menos 5 FIIs e 5 Ações para considerar o scrape válido
        if (homeData.gainers.length < 2 || fiisRaw.length < 5 || stocksRaw.length < 5) {
            console.log('Main scraping insufficient, fetching backup...');
            const backup = await fetchBrapiBackup();
            
            if (backup && backup.items.length > 10) {
                homeData = { gainers: backup.gainers, losers: backup.losers };
                fiisRaw = backup.items.filter((i: any) => i.type === 'fiis');
                stocksRaw = backup.items.filter((i: any) => i.type === 'acoes');
                usedFallback = true;
            } else {
                // Último recurso: Dados estáticos completos
                const staticData = getStaticFallback();
                homeData = { gainers: staticData.gainers, losers: staticData.losers };
                fiisRaw = staticData.items.filter((i: any) => i.type === 'fiis');
                stocksRaw = staticData.items.filter((i: any) => i.type === 'acoes');
                usedFallback = true;
            }
        }

        // --- FILTRAGEM E RESPOSTA ---
        const fiiGainers = homeData.gainers.filter(i => isFiiTicker(i.ticker));
        const fiiLosers = homeData.losers.filter(i => isFiiTicker(i.ticker));
        const stockGainers = homeData.gainers.filter(i => !isFiiTicker(i.ticker));
        const stockLosers = homeData.losers.filter(i => !isFiiTicker(i.ticker));

        // Rankings: Ordena, mas não corta mais com slice() agressivo
        const highYieldFIIs = [...fiisRaw].sort((a, b) => b.dy_12m - a.dy_12m);
        const discountedFIIs = [...fiisRaw].filter(f => f.p_vp > 0).sort((a, b) => a.p_vp - b.p_vp);

        const discountedStocks = [...stocksRaw].filter(s => s.p_l > 0).sort((a, b) => a.p_l - b.p_l);
        const highYieldStocks = [...stocksRaw].sort((a, b) => b.dy_12m - a.dy_12m);

        return res.status(200).json({
            market_status: "Aberto",
            last_update: new Date().toISOString(),
            source_type: usedFallback ? 'backup' : 'live',
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
            sources: [{ title: usedFallback ? 'Brapi / Backup' : 'Investidor10', uri: 'https://investidor10.com.br' }]
        });

    } catch (error: any) {
        console.error('API Market Fatal Error:', error);
        const staticData = getStaticFallback();
        return res.status(200).json({
            market_status: "Erro",
            last_update: new Date().toISOString(),
            error: true,
            highlights: {
                fiis: { gainers: [], losers: [], high_yield: [], discounted: [] },
                stocks: { gainers: [], losers: [], high_yield: [], discounted: [] }
            }
        });
    }
}
