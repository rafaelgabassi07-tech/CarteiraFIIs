
import { AssetPosition, PortfolioInsight, AssetType } from "../types";

/**
 * Analisa os dados da carteira e gera insights (Stories) baseados nos ativos do usuário.
 * Stories 2.0: Foca em Risco (Concentração), Diversificação, Dividendos e Oportunidades.
 */
export const analyzePortfolio = (
    portfolio: AssetPosition[], 
    ipca: number
): PortfolioInsight[] => {
    const insights: PortfolioInsight[] = [];
    const todayStr = new Date().toISOString().split('T')[0];

    // Se a carteira estiver vazia, não há insights
    if (!portfolio || portfolio.length === 0) return [];

    // --- CÁLCULOS PRELIMINARES ---
    const totalValue = portfolio.reduce((acc, p) => acc + ((p.currentPrice || 0) * p.quantity), 0);
    const totalCost = portfolio.reduce((acc, p) => acc + (p.averagePrice * p.quantity), 0);

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
            score, // Score mais alto aparece primeiro
            timestamp: Date.now(),
            // Link para detalhes externos
            url: ticker ? `https://investidor10.com.br/${ticker.endsWith('11') || ticker.endsWith('11B') ? 'fiis' : 'acoes'}/${ticker.toLowerCase()}/` : undefined
        });
    };

    if (totalValue <= 0) return [];

    // --- 1. RISCO DE CONCENTRAÇÃO (Novo no 2.0) ---
    // Verifica se algum ativo representa mais de 25% da carteira
    const heavyAsset = portfolio.find(p => {
        const assetVal = (p.currentPrice || 0) * p.quantity;
        return (assetVal / totalValue) > 0.25;
    });

    if (heavyAsset) {
        const weight = (((heavyAsset.currentPrice || 0) * heavyAsset.quantity) / totalValue) * 100;
        createStory('concentration', 'warning', 'Risco de Concentração', 
            `Cuidado: ${heavyAsset.ticker} representa ${weight.toFixed(0)}% do seu patrimônio. Uma diversificação saudável geralmente limita ativos a 10-15%.`, 98, heavyAsset.ticker);
    }

    // --- 2. DIVERSIFICAÇÃO SAUDÁVEL (Novo no 2.0) ---
    // Se tiver pelo menos 8 ativos e nenhum passar de 15%
    const maxConcentration = Math.max(...portfolio.map(p => ((p.currentPrice || 0) * p.quantity) / totalValue));
    if (portfolio.length >= 8 && maxConcentration < 0.15) {
        createStory('diversification', 'success', 'Carteira Equilibrada', 
            `Parabéns! Sua carteira está bem diversificada. Nenhum ativo ultrapassa 15% do total, reduzindo riscos específicos.`, 92);
    }

    // --- 3. Destaques de Volatilidade ---
    const activeAssets = portfolio.filter(a => typeof a.dailyChange === 'number');
    const sortedByChange = [...activeAssets].sort((a, b) => (b.dailyChange || 0) - (a.dailyChange || 0));
    
    if (sortedByChange.length > 0) {
        const topGainer = sortedByChange[0];
        // Sobe o sarrafo para 1.5% para ser relevante
        if ((topGainer.dailyChange || 0) > 1.5) {
            createStory('gainer', 'volatility_up', 'Foguete do Dia', 
                `${topGainer.ticker} está performando acima da média hoje com alta de ${topGainer.dailyChange?.toFixed(2)}%.`, 85, topGainer.ticker);
        }

        const topLoser = sortedByChange[sortedByChange.length - 1];
        if ((topLoser.dailyChange || 0) < -1.5) {
            createStory('loser', 'volatility_down', 'Correção', 
                `${topLoser.ticker} recuou ${Math.abs(topLoser.dailyChange || 0).toFixed(2)}% hoje. Pode ser uma oportunidade de aporte?`, 80, topLoser.ticker);
        }
    }

    // --- 4. Dividend King (Maior Pagador) ---
    const topYield = [...portfolio].sort((a, b) => (b.dy_12m || 0) - (a.dy_12m || 0))[0];
    if (topYield && (topYield.dy_12m || 0) > 10) {
        createStory('high-yield', 'success', 'Máquina de Renda', 
            `${topYield.ticker} é seu maior pagador de dividendos com um Yield de ${topYield.dy_12m?.toFixed(2)}% nos últimos 12 meses.`, 90, topYield.ticker);
    }

    // --- 5. Oportunidades de Valor (P/VP) ---
    // Foca em FIIs de TIJOLO ou HIBRIDOS (vacância baixa) que estão descontados
    const opportunities = portfolio.filter(a => 
        a.assetType === AssetType.FII && 
        (a.p_vp || 0) > 0.40 && // Filtra lixo/erro
        (a.p_vp || 0) < 0.95 && // Desconto real
        (a.vacancy || 0) < 15   // Qualidade mínima
    );

    if (opportunities.length > 0) {
        const bestOpp = opportunities.sort((a, b) => (a.p_vp || 0) - (b.p_vp || 0))[0];
        const discount = (1 - (bestOpp.p_vp || 1)) * 100;
        createStory('discount', 'opportunity', 'Oportunidade de Valor', 
            `${bestOpp.ticker} está sendo negociado com ${discount.toFixed(0)}% de desconto sobre o valor patrimonial.`, 88, bestOpp.ticker);
    }

    // --- 6. Rentabilidade Real (Ganho vs IPCA) ---
    if (totalCost > 0) {
        const rentability = ((totalValue / totalCost) - 1) * 100;
        const realGain = rentability - ipca;

        if (realGain > 2) {
            createStory('inflation-win', 'success', 'Vencendo a Inflação', 
                `Sua carteira tem ganho real positivo! Valorização de ${rentability.toFixed(2)}% contra IPCA de ${ipca}%.`, 95);
        }
    }

    // --- 7. Alerta de Liquidez (Novo) ---
    // Verifica se tem algum ativo com liquidez muito baixa (ex: < 100k)
    /* Implementação futura dependendo da disponibilidade do dado de liquidez numérica precisa */

    // Ordena por relevância (score) e limita a 10 stories
    return insights.sort((a, b) => b.score - a.score).slice(0, 10);
};
