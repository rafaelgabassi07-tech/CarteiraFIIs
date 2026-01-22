
import { AssetPosition, PortfolioInsight, AssetType } from "../types";

/**
 * O "Cérebro" do App.
 * Analisa a carteira do usuário e gera insights baseados em heurísticas financeiras.
 */
export const analyzePortfolio = (portfolio: AssetPosition[], ipca: number): PortfolioInsight[] => {
    const insights: PortfolioInsight[] = [];
    
    if (portfolio.length === 0) return [];

    const totalBalance = portfolio.reduce((acc, p) => acc + (p.currentPrice || p.averagePrice) * p.quantity, 0);
    
    // Cálculo do Yield Médio Ponderado da Carteira
    let weightedDySum = 0;
    let fiisTotal = 0;
    let stocksTotal = 0;

    portfolio.forEach(asset => {
        const val = (asset.currentPrice || 0) * asset.quantity;
        const dy = asset.dy_12m || 0;
        weightedDySum += (dy * val);

        if (asset.assetType === AssetType.FII) fiisTotal += val;
        else stocksTotal += val;
    });

    const portfolioDy = totalBalance > 0 ? weightedDySum / totalBalance : 0;

    // 1. ANÁLISE DE INFLAÇÃO (IPCA)
    // Só exibe se a diferença for significativa para não ser óbvio demais
    if (ipca > 0) {
        const realGain = portfolioDy - ipca;
        if (realGain < 0) {
            insights.push({
                id: 'inflation-loss',
                type: 'warning',
                title: 'Perda de Poder de Compra',
                message: `Yield da carteira (${portfolioDy.toFixed(2)}%) está abaixo da inflação (${ipca.toFixed(2)}%).`,
                score: 95
            });
        }
    }

    // 2. DESBALANCEAMENTO DE CLASSES
    if (totalBalance > 0) {
        const fiiPct = (fiisTotal / totalBalance) * 100;
        const stockPct = (stocksTotal / totalBalance) * 100;

        if (fiiPct > 85 && stocksTotal > 0) {
            insights.push({
                id: 'imbalance-fii',
                type: 'neutral',
                title: 'Exposição em FIIs',
                message: `Sua carteira é ${fiiPct.toFixed(0)}% FIIs. Considere equilibrar com Ações para crescimento.`,
                score: 50
            });
        } else if (stockPct > 85 && fiisTotal > 0) {
            insights.push({
                id: 'imbalance-stock',
                type: 'neutral',
                title: 'Exposição em Ações',
                message: `Sua carteira é ${stockPct.toFixed(0)}% Ações. FIIs poderiam reduzir a volatilidade.`,
                score: 50
            });
        }
    }

    // 3. ANÁLISE DE ATIVOS INDIVIDUAIS
    portfolio.forEach(asset => {
        const currentVal = (asset.currentPrice || 0) * asset.quantity;
        const allocation = totalBalance > 0 ? (currentVal / totalBalance) * 100 : 0;

        // A. Risco de Concentração (Apenas se for muito alto)
        if (allocation > 30 && portfolio.length >= 4) {
            insights.push({
                id: `conc-${asset.ticker}`,
                type: 'warning',
                title: 'Concentração Alta',
                message: `${asset.ticker} representa ${allocation.toFixed(0)}% do patrimônio.`,
                relatedTicker: asset.ticker,
                score: 70
            });
        }

        // B. Alerta de Vacância (FIIs) - CRÍTICO
        if (asset.assetType === AssetType.FII && asset.vacancy !== undefined && asset.vacancy > 15) {
            insights.push({
                id: `vac-${asset.ticker}`,
                type: 'warning',
                title: `Vacância Alta: ${asset.ticker}`,
                message: `${asset.ticker} está com ${asset.vacancy}% de vacância física. Risco de queda nos proventos.`,
                relatedTicker: asset.ticker,
                score: 90
            });
        }

        // C. Oportunidades FIIs (Desconto)
        if (asset.assetType === AssetType.FII && asset.p_vp && asset.p_vp > 0) {
            if (asset.p_vp < 0.85 && asset.dy_12m && asset.dy_12m > 9 && (!asset.vacancy || asset.vacancy < 10)) {
                insights.push({
                    id: `opp-${asset.ticker}`,
                    type: 'opportunity',
                    title: 'Desconto Elevado',
                    message: `${asset.ticker} (P/VP ${asset.p_vp.toFixed(2)}) parece descontado com bons fundamentos.`,
                    relatedTicker: asset.ticker,
                    score: 80
                });
            } 
        }

        // D. Dividend Trap Potencial (Yield altíssimo mas P/VP muito baixo pode indicar problema)
        if (asset.assetType === AssetType.FII && asset.dy_12m && asset.dy_12m > 18 && asset.p_vp && asset.p_vp < 0.7) {
             insights.push({
                id: `trap-${asset.ticker}`,
                type: 'warning',
                title: 'Cuidado: Dividend Yield',
                message: `${asset.ticker} tem DY de ${asset.dy_12m}% mas P/VP de ${asset.p_vp}. Pode ser um risco não recorrente.`,
                relatedTicker: asset.ticker,
                score: 85
            });
        }

        // E. Oportunidades Ações (Graham Simplificado)
        if (asset.assetType === AssetType.STOCK && asset.p_l && asset.p_l > 0 && asset.p_vp && asset.p_vp > 0) {
            if (asset.p_l * asset.p_vp < 22.5 && asset.roe && asset.roe > 10) {
                insights.push({
                    id: `value-${asset.ticker}`,
                    type: 'opportunity',
                    title: 'Valor Justo',
                    message: `${asset.ticker} negocia a múltiplos atrativos (Graham) com ROE de ${asset.roe}%.`,
                    relatedTicker: asset.ticker,
                    score: 75
                });
            }
        }
    });
    
    // Ordena por prioridade (Score maior primeiro) e pega top 4 para não poluir
    return insights.sort((a, b) => b.score - a.score).slice(0, 4);
};
