
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
        'Referer': 'https://investidor10.com.br/',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
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
        // Executa requests em paralelo
        const [homeResponse, rankingResponse] = await Promise.all([
            client.get('https://investidor10.com.br/'),
            client.get('https://investidor10.com.br/fiis/ranking/')
        ]);

        // 1. Processar Home (Altas e Baixas)
        const $home = cheerio.load(homeResponse.data);
        const gainers: any[] = [];
        const losers: any[] = [];

        // Função genérica para extrair dados de uma lista de elementos
        // Changed type to 'any' to fix TS2314/TS2322 build errors with Cheerio generics
        const extractAssets = (elements: any, type: 'gain' | 'loss', limit = 4) => {
            const list: any[] = [];
            
            elements.each((_: any, el: any) => {
                if (list.length >= limit) return;

                let ticker = '';
                let priceStr = '';
                let changeStr = '';

                // Tenta estrutura de CARD (comum na Home mobile/desktop)
                if ($home(el).find('.ticker, .name').length > 0) {
                    ticker = $home(el).find('.ticker, .name').first().text().trim();
                    priceStr = $home(el).find('.price, .value').first().text().trim();
                    changeStr = $home(el).find('.change, .percentage').first().text().trim();
                } 
                // Tenta estrutura de TABELA (se mudarem para listagem simples)
                else if ($home(el).find('td').length >= 3) {
                    ticker = $home(el).find('td').eq(0).text().trim();
                    priceStr = $home(el).find('td').eq(1).text().trim();
                    changeStr = $home(el).find('td').eq(2).text().trim();
                }

                if (!ticker || !changeStr) return;

                const price = parseValue(priceStr);
                const change = parseValue(changeStr);

                // Filtro de consistência
                if (type === 'gain' && change <= 0) return;
                if (type === 'loss' && change >= 0) return;

                list.push({
                    ticker,
                    name: ticker,
                    price,
                    change,
                    assetType: 'STOCK', // Home page geralmente prioriza Ações nos destaques
                    type,
                    description: type === 'gain' ? `Alta de ${changeStr}` : `Queda de ${changeStr}`
                });
            });
            return list;
        };

        // Procura por seções baseando-se no TEXTO do título
        $home('h2, h3, h4, .title').each((_: any, titleEl: any) => {
            const titleText = $home(titleEl).text().toLowerCase();
            const parentSection = $home(titleEl).closest('section, div.container, .content, .box');

            if (titleText.includes('maiores altas')) {
                // Tenta achar a lista dentro desta seção. 
                let container = parentSection.find('#tabs-1, .active, .list-ticker').first();
                if (container.length === 0) container = parentSection; // Fallback para a própria seção
                
                const items = extractAssets(container.find('.card-ticker, .ticker-card, tbody tr, li'), 'gain');
                if (items.length > 0 && gainers.length === 0) gainers.push(...items);
            }

            if (titleText.includes('maiores baixas')) {
                let container = parentSection.find('#tabs-1, .active, .list-ticker').first();
                if (container.length === 0) container = parentSection;

                const items = extractAssets(container.find('.card-ticker, .ticker-card, tbody tr, li'), 'loss');
                if (items.length > 0 && losers.length === 0) losers.push(...items);
            }
        });

        // 2. Processar Oportunidades (Ranking FIIs)
        const $rank = cheerio.load(rankingResponse.data);
        const opportunities: any[] = [];
        const candidates: any[] = [];

        // Mapeamento dinâmico de colunas (header da tabela)
        const colIndex: Record<string, number> = { ticker: -1, pvp: -1, dy: -1, price: -1 };
        
        $rank('#table-ranking thead th').each((index: number, th: any) => {
            const text = $rank(th).text().toLowerCase();
            if (text.includes('ativo') || text.includes('ticker')) colIndex.ticker = index;
            else if (text.includes('p/vp')) colIndex.pvp = index;
            else if (text.includes('dy') || text.includes('yield')) colIndex.dy = index;
            else if (text.includes('cota') || text.includes('preço') || text.includes('atual')) colIndex.price = index;
        });

        if (colIndex.ticker !== -1 && colIndex.pvp !== -1) {
            $rank('#table-ranking tbody tr').each((_: any, tr: any) => {
                const tds = $rank(tr).find('td');
                const ticker = $rank(tds[colIndex.ticker]).text().trim().toUpperCase();
                
                // P/VP
                const pvpStr = $rank(tds[colIndex.pvp]).text().trim();
                const pvp = parseValue(pvpStr);

                // DY
                const dyStr = colIndex.dy !== -1 ? $rank(tds[colIndex.dy]).text().trim() : '0';
                const dy = parseValue(dyStr);

                // Price
                const priceStr = colIndex.price !== -1 ? $rank(tds[colIndex.price]).text().trim() : '0';
                const price = parseValue(priceStr);

                // Lógica de Oportunidade: Desconto saudável (0.80 a 0.98) e DY bom (>8%)
                if (pvp >= 0.8 && pvp <= 0.98 && dy > 8 && price > 0) {
                    candidates.push({
                        ticker,
                        name: ticker,
                        price,
                        change: 0, 
                        assetType: 'FII',
                        type: 'opportunity',
                        description: `P/VP ${pvp.toFixed(2)} • DY ${dy.toFixed(1)}%`,
                        score: dy // Pontuação baseada no Yield
                    });
                }
            });
        }

        // Seleciona os melhores (maior DY) e embaralha levemente para variedade
        candidates.sort((a, b) => b.score - a.score);
        const topCandidates = candidates.slice(0, 10).sort(() => 0.5 - Math.random()); // Top 10 embaralhados
        opportunities.push(...topCandidates.slice(0, 4));

        // Fallback Mock se tudo falhar (estrutura do site mudou drasticamente)
        if (gainers.length === 0) {
            gainers.push({ ticker: 'VALE3', name: 'Vale', price: 62.50, change: 1.2, assetType: 'STOCK', type: 'gain', description: 'Dados indisponíveis' });
        }
        if (losers.length === 0) {
            losers.push({ ticker: 'MGLU3', name: 'Magalu', price: 2.10, change: -2.5, assetType: 'STOCK', type: 'loss', description: 'Dados indisponíveis' });
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
