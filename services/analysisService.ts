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
    
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
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
        if (ticker && usedTickers.has(ticker) && score < 90) return;
        if (ticker) usedTickers.add(ticker);

        const randomFactor = Math.random() * 2;

        insights.push({
            id: `story-${idSuffix}-${ticker || 'general'}-${todayStr}`,
            type, 
            title, 
            message, 
            relatedTicker: ticker, 
            score: score + randomFactor, 
            timestamp: Date.now(),
            url: ticker ? `https://investidor10.com.br/${ticker.endsWith('11') || ticker.endsWith('11B') ? 'fiis' : 'acoes'}/${ticker.toLowerCase()}/` : undefined
        });
    };

    // Prepara dados calculados
    let totalPortfolioValue = 0;
    let weightedDailyChange = 0;
    const sectors = new Set<string>();
    let assetsWithPositiveChange = 0;

    const activeAssets = portfolio.map(p => {
        const val = (p.currentPrice || 0) * p.quantity;
        const change = p.dailyChange || 0;
        
        totalPortfolioValue += val;
        
        if (p.segment) sectors.add(p.segment);
        if (change > 0) assetsWithPositiveChange++;

        if (p.currentPrice && p.currentPrice > 0) {
            const previousPrice = p.currentPrice / (1 + (change/100));
            const gainLoss = (p.currentPrice - previousPrice) * p.quantity;
            weightedDailyChange += gainLoss;
        }

        return { ...p, totalValue: val };
    }).sort((a, b) => b.totalValue - a.totalValue); 

    const portfolioPercentChange = totalPortfolioValue > 0 ? (weightedDailyChange / totalPortfolioValue) * 100 : 0;

    // --- 1. RESUMO DO MERCADO (Sempre aparece) ---
    if (Math.abs(portfolioPercentChange) > 0.1) {
        const isPositive = portfolioPercentChange > 0;
        createStory(
            'market-summary', 
            isPositive ? 'success' : 'warning',
            isPositive ? 'Carteira em Alta 🟢' : 'Carteira em Baixa 🔴',
            `Sua carteira ${isPositive ? 'valoriza' : 'recua'} aproximadamente ${Math.abs(portfolioPercentChange).toFixed(2)}% hoje. ${isPositive ? 'O mercado está favorável.' : 'Movimento natural de correção.'}`,
            100 
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

    // --- 3. SEQUÊNCIA DE ALTA (STREAK) - Simulado ---
    // Como não temos histórico diário persistido aqui, usamos a variação do dia + indicativo técnico se disponível
    if (assetsWithPositiveChange > (activeAssets.length * 0.7)) {
        createStory(
            'bull-run',
            'success',
            'Maré Verde 🌊',
            `Mais de 70% dos seus ativos estão em alta hoje. Um dia de forte valorização generalizada.`,
            92
        );
    }

    // --- 4. RENDA & DIVIDENDOS ---
    
    // Escudo contra Inflação
    const inflationShield = activeAssets.find(a => (a.dy_12m || 0) > (ipca + 3));
    if (inflationShield) {
        createStory(
            'inflation-shield',
            'inflation-shield',
            'Vencendo a Inflação 🛡️',
            `${inflationShield.ticker} possui um DY de ${(inflationShield.dy_12m || 0).toFixed(1)}%, superando o IPCA (${ipca}%) com folga.`,
            89,
            inflationShield.ticker
        );
    }

    // --- 5. VALUATION & OPORTUNIDADES ---
    
    // Alerta de Vacância
    const highVacancyFii = activeAssets.find(a => a.assetType === AssetType.FII && (a.vacancy || 0) > 15);
    if (highVacancyFii) {
        createStory(
            'high-vacancy',
            'warning',
            'Vacância Elevada 🏚️',
            `${highVacancyFii.ticker} está com vacância física de ${(highVacancyFii.vacancy || 0).toFixed(1)}%. Isso pode impactar rendimentos futuros.`,
            88,
            highVacancyFii.ticker
        );
    }

    // FII Barato (PVP)
    const cheapFii = activeAssets.find(a => 
        a.assetType === AssetType.FII && (a.p_vp || 0) > 0.4 && (a.p_vp || 0) < 0.90
    );
    if (cheapFii) {
        createStory(
            'opportunity-pvp',
            'opportunity',
            'Desconto Patrimonial 🏷️',
            `${cheapFii.ticker} está negociado com desconto de ${(100 - (cheapFii.p_vp || 0)*100).toFixed(0)}% sobre o valor patrimonial.`,
            85,
            cheapFii.ticker
        );
    }

    // FII Caro (Alerta)
    const expensiveFii = activeAssets.find(a => 
        a.assetType === AssetType.FII && (a.p_vp || 0) > 1.15
    );
    if (expensiveFii) {
        createStory(
            'expensive-pvp',
            'warning',
            'Ágio Elevado ⚠️',
            `${expensiveFii.ticker} está caro, custando ${(expensiveFii.p_vp || 0).toFixed(2)}x o seu valor patrimonial. Cuidado com novos aportes.`,
            83,
            expensiveFii.ticker
        );
    }

    // Preço Justo de Graham (Ações)
    const grahamStock = activeAssets.find(a => {
        if (a.assetType !== AssetType.STOCK || !a.lpa || !a.vpa || a.lpa < 0 || a.vpa < 0) return false;
        const intrinsicValue = Math.sqrt(22.5 * a.lpa * a.vpa);
        return (a.currentPrice || 0) < intrinsicValue * 0.7; // Margem de segurança de 30%
    });

    if (grahamStock) {
         createStory(
            'graham-opportunity',
            'opportunity',
            'Oportunidade Graham 🧠',
            `${grahamStock.ticker} está abaixo do valor intrínseco de Graham (VPA x LPA). Potencial oportunidade de valor.`,
            84,
            grahamStock.ticker
        );
    }

    // --- 6. ESTRUTURA DA CARTEIRA ---

    // Diversificação
    if (sectors.size >= 4 && activeAssets.length >= 5) {
        createStory(
            'diversification-good',
            'diversification-good',
            'Bem Diversificado 🌐',
            `Você possui ativos em ${sectors.size} setores diferentes. Isso ajuda a reduzir riscos específicos.`,
            75
        );
    }

    // Alerta de Concentração
    const concentrated = activeAssets.find(a => (a.totalValue / totalPortfolioValue) > 0.30);
    if (concentrated) {
        const pct = ((concentrated.totalValue / totalPortfolioValue) * 100).toFixed(0);
        createStory(
            'risk-concentration',
            'risk-concentration',
            'Risco de Concentração ⚖️',
            `${concentrated.ticker} representa ${pct}% do seu patrimônio total. Monitore este risco.`,
            80,
            concentrated.ticker
        );
    }

    // --- 7. SPOTLIGHT (Preenchimento Inteligente) ---
    if (insights.length < 5 && activeAssets.length > 0) {
        const availableAssets = activeAssets.filter(a => !usedTickers.has(a.ticker));
        
        if (availableAssets.length > 0) {
            const randomAsset = availableAssets[Math.floor(Math.random() * availableAssets.length)];
            
            if (randomAsset.assetType === AssetType.FII) {
                createStory(
                    'spotlight-fii',
                    'spotlight-fii',
                    'Raio-X: FII 🏢',
                    `${randomAsset.ticker}: Cotação R$ ${randomAsset.currentPrice?.toFixed(2)} | P/VP ${(randomAsset.p_vp || 0).toFixed(2)}.`,
                    60,
                    randomAsset.ticker
                );
            } else {
                createStory(
                    'spotlight-stock',
                    'spotlight-stock',
                    'Raio-X: Ação 📊',
                    `${randomAsset.ticker}: ROE de ${(randomAsset.roe || 0).toFixed(1)}% e P/L ${(randomAsset.p_l || 0).toFixed(1)}x.`,
                    60,
                    randomAsset.ticker
                );
            }
        }
    }

    return insights.sort((a, b) => b.score - a.score).slice(0, 6);
};