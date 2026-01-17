
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';

const httpsAgent = new https.Agent({ 
    keepAlive: true,
    rejectUnauthorized: false
});

const client = axios.create({
    httpsAgent,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://investidor10.com.br/'
    },
    timeout: 15000
});

// Helper para limpar números (R$ 10,50 -> 10.50)
function parseValue(str: string): number {
    if (!str) return 0;
    // Remove tudo que não é dígito, vírgula ou sinal de menos
    const clean = str.replace(/[^0-9,-]/g, '');
    return parseFloat(clean.replace(',', '.')) || 0;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        // Executa requests em paralelo para otimizar tempo
        const [homeResponse, rankingResponse] = await Promise.all([
            client.get('https://investidor10.com.br/'),
            client.get('https://investidor10.com.br/fiis/ranking/')
        ]);

        // 1. Processar Home (Altas e Baixas)
        const $home = cheerio.load(homeResponse.data);
        const gainers: any[] = [];
        const losers: any[] = [];

        // Seletores baseados na estrutura do Investidor10 (Abas de Ações)
        // Geralmente: #tabs-1 (Ações), #tabs-2 (FIIs). Vamos focar em Ações para High/Low pois oscilam mais.
        
        // Extração de Altas (Geralmente a primeira tabela ou lista na home)
        // Nota: A estrutura pode variar, tentamos capturar os cards de destaque.
        
        const extractCards = (containerSelector: string, targetArray: any[], typeLabel: 'gain' | 'loss') => {
            $home(containerSelector).find('.actions-list > div, .card-ticker').each((_, el) => {
                if (targetArray.length >= 4) return;
                
                const ticker = $home(el).find('.ticker, .name').first().text().trim();
                const priceStr = $home(el).find('.price, .value').first().text().trim();
                const changeStr = $home(el).find('.change, .percentage').first().text().trim();
                
                // Filtra vazios
                if (!ticker || !changeStr) return;

                const change = parseValue(changeStr);
                const price = parseValue(priceStr);

                // Valida se é realmente alta ou baixa baseado na lista que estamos iterando
                if (typeLabel === 'gain' && change < 0) return;
                if (typeLabel === 'loss' && change > 0) return;

                targetArray.push({
                    ticker,
                    name: ticker, // Nome curto igual ao ticker por padrão
                    price,
                    change,
                    assetType: 'STOCK', // Default para Ações na home
                    type: typeLabel,
                    description: `Variação: ${changeStr}`
                });
            });
        };

        // Tenta capturar das tabelas de "Altas" e "Baixas" que costumam ter IDs ou classes específicas
        // Fallback genérico: Procura tabelas com headers "Cotação" e "Variação"
        $home('.sc-bdfBwQ, .rankings-content').each((_, section) => {
             const title = $home(section).find('h2, .title').text().toLowerCase();
             if (title.includes('altas')) {
                 $home(section).find('table tbody tr').each((i, tr) => {
                     if (gainers.length >= 4) return;
                     const ticker = $home(tr).find('td').eq(0).text().trim();
                     const price = parseValue($home(tr).find('td').eq(1).text());
                     const change = parseValue($home(tr).find('td').eq(2).text());
                     if(ticker && change > 0) {
                         gainers.push({ ticker, name: ticker, price, change, assetType: 'STOCK', type: 'gain', description: 'Alta do dia' });
                     }
                 });
             } else if (title.includes('baixas')) {
                 $home(section).find('table tbody tr').each((i, tr) => {
                     if (losers.length >= 4) return;
                     const ticker = $home(tr).find('td').eq(0).text().trim();
                     const price = parseValue($home(tr).find('td').eq(1).text());
                     const change = parseValue($home(tr).find('td').eq(2).text());
                     if(ticker && change < 0) {
                         losers.push({ ticker, name: ticker, price, change, assetType: 'STOCK', type: 'loss', description: 'Baixa do dia' });
                     }
                 });
             }
        });

        // 2. Processar Oportunidades (Ranking FIIs)
        const $rank = cheerio.load(rankingResponse.data);
        const opportunities: any[] = [];
        const candidates: any[] = [];

        $rank('#table-ranking tbody tr').each((_, tr) => {
            // Colunas usuais: Ticker, Cotação, P/VP, DY, Liquidez...
            // Precisamos mapear pelo index, mas Investidor10 pode mudar.
            // Vamos tentar achar o index pelo header se possível, ou assumir padrão.
            // Padrão visual: Ticker(0), Cotação(1), P/VP(2), DY(3)... (aproximado)
            
            // Melhor abordagem: pegar texto e validar
            const ticker = $rank(tr).find('td').eq(0).text().trim().toUpperCase();
            const pvpStr = $rank(tr).find('td').eq(2).text().trim(); 
            const dyStr = $rank(tr).find('td').eq(3).text().trim();
            const priceStr = $rank(tr).find('td').eq(1).text().trim();

            const pvp = parseValue(pvpStr);
            const dy = parseValue(dyStr);
            const price = parseValue(priceStr);

            // Filtro de Oportunidade: FII barato (0.8 < P/VP < 0.98) e bom pagador (DY > 6%)
            if (pvp > 0.8 && pvp < 0.98 && dy > 6 && price > 0) {
                candidates.push({
                    ticker,
                    name: ticker,
                    price,
                    change: 0, // Ranking não mostra variação dia fácil, usamos 0
                    assetType: 'FII',
                    type: 'opportunity',
                    description: `P/VP: ${pvp.toFixed(2)} • DY: ${dy.toFixed(1)}%`,
                    pvp // guardado para sort
                });
            }
        });

        // Seleciona 4 aleatórios ou os melhores do filtro para variar
        // Shuffle array
        const shuffled = candidates.sort(() => 0.5 - Math.random());
        opportunities.push(...shuffled.slice(0, 4));

        // Fallback Mock se o scraper falhar totalmente (layout mudou)
        if (gainers.length === 0) {
            gainers.push({ ticker: 'VALE3', name: 'Vale', price: 62.50, change: 1.2, assetType: 'STOCK', type: 'gain', description: 'Dados simulados (Scraper falhou)' });
        }
        if (losers.length === 0) {
            losers.push({ ticker: 'MGLU3', name: 'Magalu', price: 2.10, change: -2.5, assetType: 'STOCK', type: 'loss', description: 'Dados simulados (Scraper falhou)' });
        }

        return res.status(200).json({
            gainers,
            losers,
            opportunities,
            lastUpdate: Date.now()
        });

    } catch (error: any) {
        console.error('Market Overview Scraper Error:', error);
        return res.status(500).json({ error: 'Failed to scrape market data', details: error.message });
    }
}
