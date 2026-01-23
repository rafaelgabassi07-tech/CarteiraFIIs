
import type { VercelRequest, VercelResponse } from '@vercel/node';
import Parser from 'rss-parser';

export default async function handler(request: VercelRequest, response: VercelResponse) {
    // Headers padrão
    response.setHeader('Access-Control-Allow-Credentials', 'true');
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    response.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );
    // Cache agressivo para evitar rate limit do Google (15 min)
    response.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=60');

    if (request.method === 'OPTIONS') {
        return response.status(200).end();
    }

    const parser = new Parser({
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        timeout: 10000,
        customFields: {
            item: [['source', 'sourceObj']],
        },
    });

    // Fontes confiáveis e mapeamento de domínios
    const knownSources: Record<string, { name: string; domain: string }> = {
        'clube fii': { name: 'Clube FII', domain: 'clubefii.com.br' },
        'funds explorer': { name: 'Funds Explorer', domain: 'fundsexplorer.com.br' },
        'status invest': { name: 'Status Invest', domain: 'statusinvest.com.br' },
        'fiis.com.br': { name: 'FIIs.com.br', domain: 'fiis.com.br' },
        'suno': { name: 'Suno Notícias', domain: 'suno.com.br' },
        'investidor10': { name: 'Investidor10', domain: 'investidor10.com.br' },
        'money times': { name: 'Money Times', domain: 'moneytimes.com.br' },
        'infomoney': { name: 'InfoMoney', domain: 'infomoney.com.br' },
        'investing.com': { name: 'Investing.com', domain: 'br.investing.com' },
        'mais retorno': { name: 'Mais Retorno', domain: 'maisretorno.com' },
        'valor investe': { name: 'Valor Investe', domain: 'valorinveste.globo.com' },
        'exame': { name: 'Exame', domain: 'exame.com' },
        'brazil journal': { name: 'Brazil Journal', domain: 'braziljournal.com' },
        'seu dinheiro': { name: 'Seu Dinheiro', domain: 'seudinheiro.com' },
        'neofeed': { name: 'NeoFeed', domain: 'neofeed.com.br' },
        'bmc news': { name: 'BMC News', domain: 'bmcnews.com.br' },
        'the cap': { name: 'The Cap', domain: 'thecap.com.br' },
        'inteligência financeira': { name: 'Inteligência Financeira', domain: 'inteligenciafinanceira.com.br' },
        'valor econômico': { name: 'Valor Econômico', domain: 'valor.globo.com' },
        'estadao': { name: 'Estadão', domain: 'estadao.com.br' },
        'folha': { name: 'Folha de S.Paulo', domain: 'folha.uol.com.br' },
        'cnn brasil': { name: 'CNN Brasil', domain: 'cnnbrasil.com.br' },
        'uol economia': { name: 'UOL Economia', domain: 'economia.uol.com.br' },
        'forbes': { name: 'Forbes Brasil', domain: 'forbes.com.br' },
        'bloomberg línea': { name: 'Bloomberg Línea', domain: 'bloomberglinea.com.br' }
    };

    function escapeRegExp(string: string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Algoritmo simples de similaridade (Jaccard Index de palavras)
    // Usado para remover notícias duplicadas de fontes diferentes
    function isSimilar(title1: string, title2: string): boolean {
        const tokenize = (str: string) => new Set(str.toLowerCase().replace(/[^\w\s]/gi, '').split(/\s+/).filter(w => w.length > 2));
        const set1 = tokenize(title1);
        const set2 = tokenize(title2);
        
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        
        const similarity = intersection.size / union.size;
        return similarity > 0.4; // Threshold de 40% de similaridade
    }

    // Função auxiliar para limpar e validar itens
    const processItems = (items: any[], seenTitles: string[]) => {
        return items.map((item) => {
            let rawSourceName = '';
            let cleanTitle = item.title || 'Sem título';

            // Extrai nome da fonte
            if (item.sourceObj) {
                if (typeof item.sourceObj === 'string') {
                    rawSourceName = item.sourceObj;
                } else if (item.sourceObj._) {
                    rawSourceName = item.sourceObj._;
                } else if (item.sourceObj.content) {
                    rawSourceName = item.sourceObj.content;
                }
            } else {
                // Tenta extrair do título se não tiver tag source (Padrão Google News: "Título - Fonte")
                const sourcePattern = /(?: - | \| )([^-|]+)$/;
                const match = item.title.match(sourcePattern);
                if (match) {
                    rawSourceName = match[1];
                }
            }

            // Remove a fonte do título para não ficar duplicado
            if (rawSourceName) {
                cleanTitle = cleanTitle.replace(new RegExp(`(?: - | \\| )\\s*${escapeRegExp(rawSourceName)}$`), '').trim();
            }

            if (!rawSourceName) return null;

            const keyToCheck = rawSourceName.toLowerCase().trim();
            let known = null;

            if (knownSources[keyToCheck]) {
                known = knownSources[keyToCheck];
            } else {
                const foundKey = Object.keys(knownSources).find(k => keyToCheck.includes(k));
                if (foundKey) known = knownSources[foundKey];
            }

            // Se não for uma fonte conhecida, usamos o nome cru mas sem domínio para favicon (fallback genérico)
            // Mas para garantir qualidade, filtramos apenas knownSources por enquanto.
            if (!known) return null; 

            // Verificação de duplicidade SEMÂNTICA
            const isDuplicate = seenTitles.some(seen => isSimilar(seen, cleanTitle));
            if (isDuplicate) return null;
            
            seenTitles.push(cleanTitle);

            return {
                title: cleanTitle,
                link: item.link,
                publicationDate: item.pubDate || item.isoDate,
                sourceName: known.name,
                sourceHostname: known.domain,
                imageUrl: `https://www.google.com/s2/favicons?domain=${known.domain}&sz=64`,
                summary: item.contentSnippet || '',
            };
        }).filter(item => item !== null);
    };

    // Helper para categorizar notícias de busca avulsa
    const categorizeItem = (title: string, summary: string) => {
        const text = (title + ' ' + summary).toLowerCase();
        if (text.includes('fii') || text.includes('fundo imobili') || text.includes('ifix') || text.match(/[a-z]{4}11/)) return 'FIIs';
        if (text.includes('ação') || text.includes('ações') || text.includes('ibovespa') || text.includes('dividend')) return 'Ações';
        return 'Geral';
    };

    try {
        const { q } = request.query;
        // Agora usamos array de strings para iterar e comparar similaridade
        const seenTitles: string[] = [];

        // MODO BUSCA (Se 'q' foi passado na URL)
        if (q && typeof q === 'string') {
            // Adiciona filtro temporal de 30 dias na busca específica também
            const queryWithTime = `${q} when:30d`;
            const feedUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(queryWithTime)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
            const feed = await parser.parseURL(feedUrl);
            
            const processed = processItems(feed.items || [], seenTitles).map(item => ({
                ...item,
                category: categorizeItem(item.title, item.summary)
            }));

            // Ordenação explícita por data (mais recente primeiro)
            const sorted = processed.sort((a, b) => new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime());

            return response.status(200).json(sorted);
        }

        // MODO PADRÃO (Feeds Separados)
        // 1. Definição das Queries (Otimizadas para evitar contaminação cruzada)
        // Alterado de when:7d para when:30d conforme solicitado
        const queryFII = 'FII OR "Fundos Imobiliários" OR IFIX OR "Dividendos FII" when:30d';
        const queryStocks = '"Ações" OR "Ibovespa" OR "Dividendos Ações" OR "Mercado de Ações" -FII -"Fundos Imobiliários" when:30d';

        const feedUrlFII = `https://news.google.com/rss/search?q=${encodeURIComponent(queryFII)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
        const feedUrlStocks = `https://news.google.com/rss/search?q=${encodeURIComponent(queryStocks)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;

        // 2. Busca paralela
        const [feedFII, feedStocks] = await Promise.all([
            parser.parseURL(feedUrlFII),
            parser.parseURL(feedUrlStocks)
        ]);

        // 3. Processamento separado com categorização
        const articlesFII = processItems(feedFII.items || [], seenTitles).map(item => ({ ...item, category: 'FIIs' }));
        const articlesStocks = processItems(feedStocks.items || [], seenTitles).map(item => ({ ...item, category: 'Ações' }));

        // 4. União e Ordenação Final (Garante que a lista combinada esteja ordenada)
        const allArticles = [...articlesFII, ...articlesStocks]
            .sort((a, b) => new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime());

        return response.status(200).json(allArticles);

    } catch (error) {
        console.error('CRITICAL ERROR API NEWS:', error);
        return response.status(500).json({ error: 'Failed to fetch news', details: String(error) });
    }
}
