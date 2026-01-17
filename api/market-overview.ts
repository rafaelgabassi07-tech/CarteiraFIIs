
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';

const httpsAgent = new https.Agent({ 
    keepAlive: true,
    rejectUnauthorized: false
});

// Configuração avançada de Headers para simular Chrome real e burlar WAF
const getHeaders = () => ({
    'Authority': 'investidor10.com.br',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cache-Control': 'max-age=0',
    'Dnt': '1',
    'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.google.com/'
});

const client = axios.create({
    httpsAgent,
    timeout: 10000,
    headers: getHeaders()
});

// Helper para limpar números (R$ 10,50 -> 10.50)
function parseValue(str: string): number {
    if (!str) return 0;
    // Remove tudo que não é dígito, vírgula ou sinal de menos
    const clean = str.replace(/[^0-9,-]/g, '');
    return parseFloat(clean.replace(',', '.')) || 0;
}

// Helper para tentar buscar conteúdo (Direto -> Fallback Google Cache)
async function fetchHtml(url: string): Promise<string> {
    try {
        const response = await client.get(url);
        return response.data;
    } catch (error: any) {
        console.warn(`Direct access failed for ${url}, trying Google Cache...`);
        try {
            // Tenta via Google Cache se for bloqueado
            const cacheUrl = `http://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(url)}`;
            const cacheResponse = await client.get(cacheUrl);
            return cacheResponse.data;
        } catch (cacheError) {
            console.error('Google Cache failed:', cacheError);
            throw error; // Retorna erro original se ambos falharem
        }
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        // Executa requests em paralelo com tratamento de erro individual
        const [homeHtml, rankingHtml] = await Promise.all([
            fetchHtml('https://investidor10.com.br/').catch(() => ''),
            fetchHtml('https://investidor10.com.br/fiis/ranking/').catch(() => '')
        ]);

        const gainers: any[] = [];
        const losers: any[] = [];
        const opportunities: any[] = [];

        // 1. Processar Home (Altas e Baixas)
        if (homeHtml) {
            const $home = cheerio.load(homeHtml);

            // Função genérica para extrair dados de uma lista de elementos
            // IMPORTANTE: Tipagem 'any' explicita para evitar conflitos de versão do Cheerio (AnyNode vs Element)
            const extractAssets = (elements: any, type: 'gain' | 'loss', limit = 4) => {
                const list: any[] = [];
                // Validação de segurança se elements é iterável
                if (elements && typeof elements.each === 'function') {
                    elements.each((_: any, el: any) => {
                        if (list.length >= limit) return;

                        let ticker = '';
                        let priceStr = '';
                        let changeStr = '';

                        // Estrutura Card (Desktop/Mobile)
                        if ($home(el).find('.ticker, .name').length > 0) {
                            ticker = $home(el).find('.ticker, .name').first().text().trim();
                            priceStr = $home(el).find('.price, .value').first().text().trim();
                            changeStr = $home(el).find('.change, .percentage').first().text().trim();
                        } 
                        // Estrutura Tabela (Fallback)
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
                            assetType: 'STOCK', 
                            type,
                            description: type === 'gain' ? `Alta de ${changeStr}` : `Queda de ${changeStr}`
                        });
                    });
                }
                return list;
            };

            // Procura seções pelo título
            $home('h2, h3, h4, .title').each((_: any, titleEl: any) => {
                const titleText = $home(titleEl).text().toLowerCase();
                // Cast explicito para 'any' para evitar erro TS2322 ao atribuir Cheerio<AnyNode>
                const parentSection: any = $home(titleEl).closest('section, div.container, .content, .box');

                if (titleText.includes('maiores altas') || titleText.includes('altas')) {
                    // Cast explicito para 'any'
                    let container: any = parentSection.find('#tabs-1, .active, .list-ticker').first();
                    if (container.length === 0) container = parentSection;
                    
                    // Cast explicito do argumento
                    const items = extractAssets(container.find('.card-ticker, .ticker-card, tbody tr, li') as any, 'gain');
                    if (items.length > 0 && gainers.length === 0) gainers.push(...items);
                }

                if (titleText.includes('maiores baixas') || titleText.includes('baixas')) {
                    let container: any = parentSection.find('#tabs-1, .active, .list-ticker').first();
                    if (container.length === 0) container = parentSection;

                    // Cast explicito do argumento
                    const items = extractAssets(container.find('.card-ticker, .ticker-card, tbody tr, li') as any, 'loss');
                    if (items.length > 0 && losers.length === 0) losers.push(...items);
                }
            });
        }

        // 2. Processar Oportunidades (Ranking FIIs)
        if (rankingHtml) {
            const $rank = cheerio.load(rankingHtml);
            const candidates: any[] = [];
            const colIndex: Record<string, number> = { ticker: -1, pvp: -1, dy: -1, price: -1 };
            
            // Mapeia colunas dinamicamente
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
                    
                    const pvpStr = $rank(tds[colIndex.pvp]).text().trim();
                    const pvp = parseValue(pvpStr);

                    const dyStr = colIndex.dy !== -1 ? $rank(tds[colIndex.dy]).text().trim() : '0';
                    const dy = parseValue(dyStr);

                    const priceStr = colIndex.price !== -1 ? $rank(tds[colIndex.price]).text().trim() : '0';
                    const price = parseValue(priceStr);

                    // Lógica de Oportunidade: P/VP entre 0.8 e 0.98 e DY > 8%
                    if (pvp >= 0.8 && pvp <= 0.98 && dy > 8 && price > 0) {
                        candidates.push({
                            ticker,
                            name: ticker,
                            price,
                            change: 0, 
                            assetType: 'FII',
                            type: 'opportunity',
                            description: `P/VP ${pvp.toFixed(2)} • DY ${dy.toFixed(1)}%`,
                            score: dy
                        });
                    }
                });
            }

            candidates.sort((a, b) => b.score - a.score);
            const topCandidates = candidates.slice(0, 10).sort(() => 0.5 - Math.random());
            opportunities.push(...topCandidates.slice(0, 4));
        }

        // Mock Fallback se tudo falhar (Evita quebrar a UI)
        if (gainers.length === 0) {
            gainers.push({ ticker: 'VALE3', name: 'Vale', price: 62.50, change: 1.2, assetType: 'STOCK', type: 'gain', description: 'Simulação (Site Bloqueado)' });
        }
        if (losers.length === 0) {
            losers.push({ ticker: 'MGLU3', name: 'Magalu', price: 2.10, change: -2.5, assetType: 'STOCK', type: 'loss', description: 'Simulação (Site Bloqueado)' });
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
