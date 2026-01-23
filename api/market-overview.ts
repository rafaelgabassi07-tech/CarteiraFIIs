
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
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': 'https://investidor10.com.br/'
};

const parseBrFloat = (str: string) => {
    if (!str) return 0;
    // Remove tudo que não é número, vírgula, ponto ou traço
    const clean = str.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.');
    const float = parseFloat(clean);
    return isNaN(float) ? 0 : float;
};

// Função para buscar dados da Home (Altas e Baixas)
async function scrapeHome() {
    try {
        const { data } = await axios.get('https://investidor10.com.br/', { headers: HEADERS, httpsAgent, timeout: 8000 });
        const $ = cheerio.load(data);
        
        const extractTable = (selector: string) => {
            const items: any[] = [];
            $(selector).find('.item').each((_, el) => {
                const ticker = $(el).find('.name-ticker span').first().text().trim();
                const name = $(el).find('.name-ticker span').last().text().trim();
                const price = parseBrFloat($(el).find('.price').text());
                const variation = parseBrFloat($(el).find('.change').text());
                
                if (ticker && price > 0) {
                    items.push({ ticker, name, price, variation_percent: variation });
                }
            });
            // Fallback para tabelas se o layout de cards falhar (versão desktop vs mobile)
            if (items.length === 0) {
                $(selector).find('tr').slice(1).each((_, tr) => {
                    const ticker = $(tr).find('td').eq(0).text().trim();
                    const price = parseBrFloat($(tr).find('td').eq(1).text());
                    const variation = parseBrFloat($(tr).find('td').eq(2).text());
                    if (ticker) items.push({ ticker, name: 'Ação', price, variation_percent: variation });
                });
            }
            return items.slice(0, 8);
        };

        // Investidor10 Home: Tabs "Altas" e "Baixas" (Geralmente Ibovespa e IFIX)
        // IDs podem variar, tentamos seletores genéricos de "Top Movers"
        const gainers = extractTable('#highs');
        const losers = extractTable('#lows');

        return { gainers, losers };
    } catch (e) {
        console.warn('Erro scraping Home:', e);
        return { gainers: [], losers: [] };
    }
}

// Função para buscar Ranking (FIIs e Ações)
async function scrapeRanking(type: 'fiis' | 'acoes') {
    try {
        const url = `https://investidor10.com.br/${type}/ranking/`;
        const { data } = await axios.get(url, { headers: HEADERS, httpsAgent, timeout: 15000 });
        const $ = cheerio.load(data);
        
        const items: any[] = [];
        const table = $('#table-ranking');
        
        table.find('tbody tr').each((_, tr) => {
            const tds = $(tr).find('td');
            // Estrutura Ranking FIIs: Ticker, Cotação, P/VP, DY, ...
            // Estrutura Ranking Ações: Ticker, Cotação, P/L, P/VP, DY, ...
            
            const ticker = $(tds[0]).text().trim();
            const price = parseBrFloat($(tds[1]).text());
            
            let p_vp = 0;
            let dy = 0;
            let p_l = 0;

            if (type === 'fiis') {
                p_vp = parseBrFloat($(tds[2]).text());
                dy = parseBrFloat($(tds[3]).text());
            } else {
                p_l = parseBrFloat($(tds[2]).text());
                p_vp = parseBrFloat($(tds[3]).text());
                dy = parseBrFloat($(tds[4]).text());
            }

            // Filtros de Qualidade Básicos para limpar "lixo"
            if (price > 0 && ticker.length <= 6) {
                items.push({
                    ticker,
                    name: type === 'fiis' ? 'Fundo Imobiliário' : 'Ação',
                    price,
                    p_vp,
                    p_l,
                    dy_12m: dy
                });
            }
        });

        return items;
    } catch (e) {
        console.warn(`Erro scraping Ranking ${type}:`, e);
        return [];
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    // Cache de 15 minutos para performance
    res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=600');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const [homeData, fiisRaw, stocksRaw] = await Promise.all([
            scrapeHome(),
            scrapeRanking('fiis'),
            scrapeRanking('acoes')
        ]);

        // PROCESSAMENTO FIIs
        // 1. High Yield: DY > 8% e < 25%, P/VP > 0.8 (Evitar fundos quebrando)
        const highYieldFIIs = fiisRaw
            .filter(f => f.dy_12m > 8 && f.dy_12m < 25 && f.p_vp > 0.8)
            .sort((a, b) => b.dy_12m - a.dy_12m)
            .slice(0, 10);

        // 2. Descontados: P/VP < 0.95 e > 0.5, DY > 6%
        const discountedFIIs = fiisRaw
            .filter(f => f.p_vp < 0.95 && f.p_vp > 0.5 && f.dy_12m > 6)
            .sort((a, b) => a.p_vp - b.p_vp)
            .slice(0, 10);

        // PROCESSAMENTO AÇÕES
        // 1. Descontadas: P/L > 0 e < 10, P/VP < 2
        const discountedStocks = stocksRaw
            .filter(s => s.p_l > 0.5 && s.p_l < 10 && s.p_vp < 2)
            .sort((a, b) => a.p_l - b.p_l)
            .slice(0, 10);

        // 2. Dividendos: DY > 6%
        const highYieldStocks = stocksRaw
            .filter(s => s.dy_12m > 6 && s.dy_12m < 30)
            .sort((a, b) => b.dy_12m - a.dy_12m)
            .slice(0, 10);

        const response = {
            market_status: "Aberto",
            last_update: new Date().toISOString(),
            highlights: {
                discounted_fiis: discountedFIIs,
                discounted_stocks: discountedStocks,
                top_gainers: homeData.gainers,
                top_losers: homeData.losers,
                high_dividend_fiis: highYieldFIIs,
                high_dividend_stocks: highYieldStocks
            },
            sources: [{ title: 'Investidor10', uri: 'https://investidor10.com.br' }]
        };

        return res.status(200).json(response);

    } catch (error: any) {
        console.error('API Market Error:', error);
        return res.status(500).json({ error: true, message: error.message });
    }
}
