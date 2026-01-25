
import { AssetPosition, PortfolioInsight, AssetType } from "../types";

/**
 * Analisa os dados da carteira e gera insights (Stories) aprimorados.
 * Inclui: Volatilidade, Yield, Valuation, Concentração e Performance.
 */
export const analyzePortfolio = (
    portfolio: AssetPosition[], 
    ipca: number
): PortfolioInsight[] => {
    const insights: PortfolioInsight[] = [];
    const todayStr = new Date().toISOString().split('T')[0];

    // Se a carteira estiver vazia, não há insights
    if (!portfolio || portfolio.length === 0) return [];

    const createStory = (
        idSuffix: string,
        type: PortfolioInsight['type'],
        title: string,
        message: string,
        score: number,
        ticker?: string
    ) => {
        insights.push({
            id: `story-${idSuffix}-${todayStr}`,
            type,
            title,
            message,
            relatedTicker: ticker,
            score,
            timestamp: Date.now(),
            url: ticker ? `https://investidor10.com.br/${ticker.endsWith('11') || ticker.endsWith('11B') ? 'fiis' : 'acoes'}/${ticker.toLowerCase()}/` : undefined
        });
    };

    // Cálculos preliminares
    let totalPortfolioValue = 0;
    const activeAssets = portfolio.map(p => {
        const val = (p.currentPrice || 0) * p.quantity;
        totalPortfolioValue += val;
        return { ...p, totalValue: val };
    });

    // --- 1. Alerta de Concentração (Novo) ---
    // Verifica se algum ativo representa mais de 25% da carteira
    if (totalPortfolioValue > 0) {
        const concentrationLimit = 0.25; // 25%
        const concentratedAsset = activeAssets.find(a => (a.totalValue / totalPortfolioValue) > concentrationLimit);
        
        if (concentratedAsset) {
            const percent = ((concentratedAsset.totalValue / totalPortfolioValue) * 100).toFixed(0);
            createStory('concentration', 'warning', 'Risco de Concentração', 
                `Cuidado! O ativo ${concentratedAsset.ticker} representa ${percent}% da sua carteira. Considere diversificar.`, 98, concentratedAsset.ticker);
        }
    }

    // --- 2. Destaques de Volatilidade (Alta/Baixa Hoje) ---
    const sortedByChange = [...activeAssets].sort((a, b) => (b.dailyChange || 0) - (a.dailyChange || 0));
    
    if (sortedByChange.length > 0) {
        const topGainer = sortedByChange[0];
        if ((topGainer.dailyChange || 0) > 1.0) { // Aumentei threshold para 1% para ser mais relevante
            createStory('gainer', 'volatility_up', 'Foguete do Dia 🚀', 
                `${topGainer.ticker} está disparando ${topGainer.dailyChange?.toFixed(2)}% hoje!`, 85, topGainer.ticker);
        }

        const topLoser = sortedByChange[sortedByChange.length - 1];
        if ((topLoser.dailyChange || 0) < -1.0) {
            createStory('loser', 'volatility_down', 'Oportunidade ou Queda?', 
                `${topLoser.ticker} caiu ${Math.abs(topLoser.dailyChange || 0).toFixed(2)}% no pregão de hoje.`, 80, topLoser.ticker);
        }
    }

    // --- 3. Rei dos Dividendos (Maior DY na Carteira) ---
    const topYield = [...activeAssets].sort((a, b) => (b.dy_12m || 0) - (a.dy_12m || 0))[0];
    if (topYield && (topYield.dy_12m || 0) > 10) { // Só mostra se for realmente alto (>10%)
        createStory('high-yield', 'success', 'Máquina de Renda 🤑', 
            `${topYield.ticker} é seu campeão de dividendos com um DY anual de ${topYield.dy_12m?.toFixed(2)}%.`, 90, topYield.ticker);
    }

    // --- 4. Oportunidades (P/VP Baixo para FIIs) ---
    const opportunities = activeAssets.filter(a => 
        a.assetType === AssetType.FII && 
        (a.p_vp || 0) > 0.4 && // Evita fundos quebrados
        (a.p_vp || 0) < 0.90   // Desconto real (>10%)
    );
    if (opportunities.length > 0) {
        const bestOpp = opportunities.sort((a, b) => (a.p_vp || 0) - (b.p_vp || 0))[0];
        createStory('discount', 'opportunity', 'Está Barato!', 
            `${bestOpp.ticker} está sendo negociado a apenas ${(bestOpp.p_vp || 0).toFixed(2)}x do seu valor patrimonial.`, 92, bestOpp.ticker);
    }

    // --- 5. Alerta de Vacância (FIIs) ---
    const highVacancy = activeAssets.find(a => a.assetType === AssetType.FII && (a.vacancy || 0) > 25);
    if (highVacancy) {
        createStory('vacancy', 'warning', 'Sinal Amarelo ⚠️', 
            `Atenção: ${highVacancy.ticker} está com vacância física alta de ${highVacancy.vacancy}%.`, 75, highVacancy.ticker);
    }

    // --- 6. Performance Geral (vs IPCA) ---
    const totalCost = activeAssets.reduce((acc, p) => acc + (p.averagePrice * p.quantity), 0);
    
    if (totalCost > 0) {
        const rentability = ((totalPortfolioValue / totalCost) - 1) * 100;

        if (rentability > ipca + 2) { // Superou IPCA com margem
            createStory('inflation-win', 'success', 'Vencendo a Inflação 🏆', 
                `Sua carteira valorizou ${rentability.toFixed(2)}%, superando o IPCA de ${ipca}%. Parabéns!`, 100);
        } else if (rentability < 0) {
            createStory('correction', 'neutral', 'Momento de Ajuste', 
                `Sua carteira está oscilando ${rentability.toFixed(2)}%. Lembre-se: o foco é no longo prazo e nos dividendos.`, 60);
        }
    }

    // Ordena por relevância (score) e limita a 10 stories
    return insights.sort((a, b) => b.score - a.score).slice(0, 10);
};
