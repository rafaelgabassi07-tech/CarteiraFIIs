
import { AssetPosition, PortfolioInsight, AssetType } from "../types";

/**
 * Analisa os dados da carteira e gera insights (Stories) aprimorados.
 * Garante uma média de 4 a 6 stories diários com vida útil de 24h.
 */
export const analyzePortfolio = (
    portfolio: AssetPosition[], 
    ipca: number
): PortfolioInsight[] => {
    const insights: PortfolioInsight[] = [];
    const todayStr = new Date().toISOString().split('T')[0];
    const usedTickers = new Set<string>();

    if (!portfolio || portfolio.length === 0) return [];

    // Helper para criar Stories
    const createStory = (
        idSuffix: string, 
        type: PortfolioInsight['type'], 
        title: string, 
        message: string, 
        score: number, 
        ticker?: string
    ) => {
        // Evita múltiplos stories sobre o mesmo ativo no mesmo dia, salvo se for muito crítico
        if (ticker && usedTickers.has(ticker) && score < 90) return;
        if (ticker) usedTickers.add(ticker);

        insights.push({
            id: `story-${idSuffix}-${ticker || 'general'}-${todayStr}`,
            type, 
            title, 
            message, 
            relatedTicker: ticker, 
            score, 
            timestamp: Date.now(),
            url: ticker ? `https://investidor10.com.br/${ticker.endsWith('11') || ticker.endsWith('11B') ? 'fiis' : 'acoes'}/${ticker.toLowerCase()}/` : undefined
        });
    };

    // Prepara dados calculados
    let totalPortfolioValue = 0;
    let weightedDailyChange = 0;

    const activeAssets = portfolio.map(p => {
        const val = (p.currentPrice || 0) * p.quantity;
        const change = p.dailyChange || 0;
        
        totalPortfolioValue += val;
        // Acumula para variação ponderada
        if (p.currentPrice && p.currentPrice > 0) {
            // (Variação * Valor Total) / Total Portfolio (feito no final)
            // Simplificação: Soma dos ganhos/perdas nominais
            const previousPrice = p.currentPrice / (1 + (change/100));
            const gainLoss = (p.currentPrice - previousPrice) * p.quantity;
            weightedDailyChange += gainLoss;
        }

        return { ...p, totalValue: val };
    }).sort((a, b) => b.totalValue - a.totalValue); // Ordena por relevância na carteira

    const portfolioPercentChange = totalPortfolioValue > 0 ? (weightedDailyChange / totalPortfolioValue) * 100 : 0;

    // --- 1. RESUMO DO MERCADO (Sempre aparece) ---
    if (Math.abs(portfolioPercentChange) > 0.1) {
        const isPositive = portfolioPercentChange > 0;
        createStory(
            'market-summary', 
            isPositive ? 'success' : 'warning',
            isPositive ? 'Carteira em Alta 🟢' : 'Carteira em Baixa 🔴',
            `Sua carteira ${isPositive ? 'valoriza' : 'recua'} aproximadamente ${Math.abs(portfolioPercentChange).toFixed(2)}% hoje. ${isPositive ? 'O mercado está favorável.' : 'Movimento natural de correção.'}`,
            100 // Score máximo para aparecer primeiro
        );
    } else {
        createStory(
            'market-stable',
            'neutral',
            'Dia Estável ⚓',
            'Sua carteira opera com estabilidade hoje, sem grandes variações no patrimônio total.',
            100
        );
    }

    // --- 2. DESTAQUES DE MOVIMENTAÇÃO (Até 2 ativos) ---
    // Filtra ativos com variação relevante (> 0.5% ou < -0.5%)
    const movers = activeAssets.filter(a => Math.abs(a.dailyChange || 0) > 0.5);
    
    // Top Gainer
    const topGainer = movers.sort((a,b) => (b.dailyChange || 0) - (a.dailyChange || 0))[0];
    if (topGainer && (topGainer.dailyChange || 0) > 0) {
        createStory(
            'top-gainer',
            'volatility_up',
            'Destaque de Alta 🚀',
            `${topGainer.ticker} lidera seus ganhos com uma alta de +${(topGainer.dailyChange || 0).toFixed(2)}% no pregão.`,
            95,
            topGainer.ticker
        );
    }

    // Top Loser
    const topLoser = movers.sort((a,b) => (a.dailyChange || 0) - (b.dailyChange || 0))[0];
    if (topLoser && (topLoser.dailyChange || 0) < 0) {
        createStory(
            'top-loser',
            'volatility_down',
            'Correção 🔻',
            `${topLoser.ticker} apresenta a maior queda do dia na sua carteira: ${(topLoser.dailyChange || 0).toFixed(2)}%.`,
            94,
            topLoser.ticker
        );
    }

    // --- 3. ANÁLISE DE PROVENTOS (Yield on Cost ou DY Atual) ---
    const dividendKing = activeAssets.find(a => (a.dy_12m || 0) > 10 && a.totalValue > 500);
    if (dividendKing) {
        createStory(
            'high-yield',
            'success',
            'Gerador de Renda 💰',
            `${dividendKing.ticker} se destaca com um Dividend Yield de ${(dividendKing.dy_12m || 0).toFixed(1)}% nos últimos 12 meses.`,
            88,
            dividendKing.ticker
        );
    }

    // --- 4. OPORTUNIDADES & ALERTAS (Valuation) ---
    
    // FII Barato (P/VP < 0.90)
    const cheapFii = activeAssets.find(a => 
        a.assetType === AssetType.FII && (a.p_vp || 0) > 0.1 && (a.p_vp || 0) < 0.92
    );
    if (cheapFii) {
        createStory(
            'opportunity-pvp',
            'opportunity',
            'Desconto Patrimonial 🏷️',
            `${cheapFii.ticker} está sendo negociado a ${(cheapFii.p_vp || 0).toFixed(2)}x do seu valor patrimonial.`,
            85,
            cheapFii.ticker
        );
    }

    // Ação Barata (P/L < 6)
    const cheapStock = activeAssets.find(a => 
        a.assetType === AssetType.STOCK && (a.p_l || 0) > 0.1 && (a.p_l || 0) < 6
    );
    if (cheapStock) {
        createStory(
            'opportunity-pl',
            'opportunity',
            'Múltiplo Atrativo 📉',
            `${cheapStock.ticker} negocia com P/L de ${(cheapStock.p_l || 0).toFixed(1)}x, historicamente baixo.`,
            84,
            cheapStock.ticker
        );
    }

    // Alerta de Concentração
    const concentrated = activeAssets.find(a => (a.totalValue / totalPortfolioValue) > 0.25);
    if (concentrated) {
        const pct = ((concentrated.totalValue / totalPortfolioValue) * 100).toFixed(0);
        createStory(
            'risk-concentration',
            'warning',
            'Atenção: Concentração ⚠️',
            `${concentrated.ticker} representa ${pct}% do seu patrimônio. Monitore este risco.`,
            80,
            concentrated.ticker
        );
    }

    // --- 5. SPOTLIGHT (Preenchimento Inteligente) ---
    // Se tivermos menos de 4 stories, pegamos um ativo aleatório relevante e mostramos um dado dele
    // para garantir que o feed tenha "vida" e novidades.
    if (insights.length < 4 && activeAssets.length > 0) {
        // Tenta achar um ativo que ainda não foi usado hoje
        const availableAssets = activeAssets.filter(a => !usedTickers.has(a.ticker));
        
        if (availableAssets.length > 0) {
            // Pega um aleatório
            const randomAsset = availableAssets[Math.floor(Math.random() * availableAssets.length)];
            
            // Decide qual métrica mostrar
            if (randomAsset.assetType === AssetType.FII) {
                createStory(
                    'spotlight-fii',
                    'news',
                    'Raio-X: FII 🏢',
                    `${randomAsset.ticker}: Cotação R$ ${randomAsset.currentPrice?.toFixed(2)} | P/VP ${(randomAsset.p_vp || 0).toFixed(2)}.`,
                    60,
                    randomAsset.ticker
                );
            } else {
                createStory(
                    'spotlight-stock',
                    'news',
                    'Raio-X: Ação 📊',
                    `${randomAsset.ticker}: ROE de ${(randomAsset.roe || 0).toFixed(1)}% e Margem Líquida de ${(randomAsset.net_margin || 0).toFixed(1)}%.`,
                    60,
                    randomAsset.ticker
                );
            }
        }
    }

    // Retorna os top 6 insights ordenados por relevância (Score)
    return insights.sort((a, b) => b.score - a.score).slice(0, 6);
};
