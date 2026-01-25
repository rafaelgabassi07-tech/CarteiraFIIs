
import { AssetPosition, PortfolioInsight, AssetType } from "../types";

/**
 * Analisa os dados da carteira e gera insights (Stories) baseados nos ativos do usuário.
 * Foca em volatilidade diária, dividendos e valuation dos ativos possuídos.
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
            // Link para detalhes externos
            url: ticker ? `https://investidor10.com.br/${ticker.endsWith('11') || ticker.endsWith('11B') ? 'fiis' : 'acoes'}/${ticker.toLowerCase()}/` : undefined
        });
    };

    // --- 1. Destaques de Volatilidade (Alta/Baixa Hoje) ---
    // Filtra ativos com variação válida vinda da API de cotação
    const activeAssets = portfolio.filter(a => typeof a.dailyChange === 'number');
    const sortedByChange = [...activeAssets].sort((a, b) => (b.dailyChange || 0) - (a.dailyChange || 0));
    
    if (sortedByChange.length > 0) {
        const topGainer = sortedByChange[0];
        // Considera destaque se subir mais de 0.5%
        if ((topGainer.dailyChange || 0) > 0.5) {
            createStory('gainer', 'volatility_up', 'Alta na Carteira', 
                `Seu ativo ${topGainer.ticker} está subindo ${topGainer.dailyChange?.toFixed(2)}% hoje.`, 90, topGainer.ticker);
        }

        const topLoser = sortedByChange[sortedByChange.length - 1];
        // Considera destaque se cair mais de 0.5%
        if ((topLoser.dailyChange || 0) < -0.5) {
            createStory('loser', 'volatility_down', 'Em Queda', 
                `${topLoser.ticker} recuou ${Math.abs(topLoser.dailyChange || 0).toFixed(2)}% no pregão.`, 85, topLoser.ticker);
        }
    }

    // --- 2. Rei dos Dividendos (Maior DY na Carteira) ---
    const topYield = [...portfolio].sort((a, b) => (b.dy_12m || 0) - (a.dy_12m || 0))[0];
    if (topYield && (topYield.dy_12m || 0) > 8) {
        createStory('high-yield', 'success', 'Gerador de Renda', 
            `${topYield.ticker} é seu maior pagador com DY de ${topYield.dy_12m?.toFixed(2)}% nos últimos 12 meses.`, 95, topYield.ticker);
    }

    // --- 3. Oportunidades (P/VP Baixo para FIIs na Carteira) ---
    const opportunities = portfolio.filter(a => 
        a.assetType === AssetType.FII && 
        (a.p_vp || 0) > 0.1 && 
        (a.p_vp || 0) < 0.98
    );
    if (opportunities.length > 0) {
        // Pega o mais descontado
        const bestOpp = opportunities.sort((a, b) => (a.p_vp || 0) - (b.p_vp || 0))[0];
        createStory('discount', 'opportunity', 'Desconto', 
            `${bestOpp.ticker} está barato! Negociado a ${bestOpp.p_vp?.toFixed(2)}x do valor patrimonial.`, 88, bestOpp.ticker);
    }

    // --- 4. Alerta de Vacância (FIIs) ---
    const highVacancy = portfolio.find(a => a.assetType === AssetType.FII && (a.vacancy || 0) > 20);
    if (highVacancy) {
        createStory('vacancy', 'warning', 'Vacância Alta', 
            `Atenção: ${highVacancy.ticker} possui vacância física de ${highVacancy.vacancy}%.`, 70, highVacancy.ticker);
    }

    // --- 5. Performance Geral (vs IPCA) ---
    // Calcula rentabilidade simples da carteira
    const totalCost = portfolio.reduce((acc, p) => acc + (p.averagePrice * p.quantity), 0);
    const totalValue = portfolio.reduce((acc, p) => acc + ((p.currentPrice || 0) * p.quantity), 0);
    
    // Evita divisão por zero
    if (totalCost > 0) {
        const rentability = ((totalValue / totalCost) - 1) * 100;

        if (rentability > ipca) {
            createStory('inflation-win', 'success', 'Acima da Inflação', 
                `Sua carteira valorizou ${rentability.toFixed(2)}% (valor atual), superando o IPCA acumulado de ${ipca}%.`, 100);
        } else if (rentability < 0) {
            createStory('correction', 'neutral', 'Momento de Ajuste', 
                `Sua carteira está em correção de ${rentability.toFixed(2)}% em relação ao custo médio. Foco no longo prazo!`, 60);
        }
    }

    // Ordena por relevância (score) e limita a 10 stories
    return insights.sort((a, b) => b.score - a.score).slice(0, 10);
};
