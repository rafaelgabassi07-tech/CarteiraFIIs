
import { AssetPosition, PortfolioInsight, AssetType } from "../types";

/**
 * O "Cérebro" do App.
 * Analisa a carteira do usuário e gera insights baseados em heurísticas financeiras.
 */
export const analyzePortfolio = (portfolio: AssetPosition[], ipca: number): PortfolioInsight[] => {
    const insights: PortfolioInsight[] = [];
    
    if (portfolio.length === 0) return [];

    const totalBalance = portfolio.reduce((acc, p) => acc + (p.currentPrice || p.averagePrice) * p.quantity, 0);
    const totalInvested = portfolio.reduce((acc, p) => acc + p.averagePrice * p.quantity, 0);
    
    // Cálculo do Yield Médio Ponderado da Carteira
    let weightedDySum = 0;
    portfolio.forEach(p => {
        const val = (p.currentPrice || 0) * p.quantity;
        const dy = p.dy_12m || 0;
        weightedDySum += (dy * val);
    });
    const portfolioDy = totalBalance > 0 ? weightedDySum / totalBalance : 0;

    // 1. ANÁLISE DE INFLAÇÃO (IPCA)
    if (ipca > 0) {
        if (portfolioDy > ipca + 3) {
            insights.push({
                id: 'inflation-win',
                type: 'success',
                title: 'Ganho Real Robusto',
                message: `Sua carteira gera ${portfolioDy.toFixed(1)}% de dividendos, superando o IPCA (${ipca.toFixed(1)}%) com folga.`,
                score: 90
            });
        } else if (portfolioDy < ipca) {
            insights.push({
                id: 'inflation-loss',
                type: 'warning',
                title: 'Abaixo da Inflação',
                message: `O Yield da sua carteira (${portfolioDy.toFixed(1)}%) está menor que o IPCA (${ipca.toFixed(1)}%). Atenção ao poder de compra.`,
                score: 95
            });
        }
    }

    // 2. ANÁLISE DE ATIVOS INDIVIDUAIS
    portfolio.forEach(asset => {
        const currentVal = (asset.currentPrice || 0) * asset.quantity;
        const allocation = totalBalance > 0 ? (currentVal / totalBalance) * 100 : 0;

        // A. Risco de Concentração
        if (allocation > 25 && portfolio.length > 3) {
            insights.push({
                id: `conc-${asset.ticker}`,
                type: 'warning',
                title: 'Concentração Alta',
                message: `${asset.ticker} representa ${allocation.toFixed(0)}% do seu patrimônio. Ideal diversificar.`,
                relatedTicker: asset.ticker,
                score: 80
            });
        }

        // B. Oportunidades FIIs (Desconto)
        if (asset.assetType === AssetType.FII && asset.p_vp && asset.p_vp > 0) {
            if (asset.p_vp < 0.90 && asset.dy_12m && asset.dy_12m > 8) {
                insights.push({
                    id: `opp-${asset.ticker}`,
                    type: 'opportunity',
                    title: 'Oportunidade de Aporte',
                    message: `${asset.ticker} está descontado (P/VP ${asset.p_vp.toFixed(2)}) e pagando bem (${asset.dy_12m.toFixed(1)}%).`,
                    relatedTicker: asset.ticker,
                    score: 85
                });
            } else if (asset.p_vp > 1.20) {
                insights.push({
                    id: `exp-${asset.ticker}`,
                    type: 'neutral',
                    title: 'Ágio Elevado',
                    message: `${asset.ticker} está sendo negociado 20% acima do valor patrimonial. Cuidado com novos aportes.`,
                    relatedTicker: asset.ticker,
                    score: 60
                });
            }
        }

        // C. Oportunidades Ações (Valor)
        if (asset.assetType === AssetType.STOCK && asset.p_l && asset.p_l > 0) {
            if (asset.p_l < 5 && asset.roe && asset.roe > 10) {
                insights.push({
                    id: `value-${asset.ticker}`,
                    type: 'opportunity',
                    title: 'Ação Descontada',
                    message: `${asset.ticker} está com P/L de ${asset.p_l.toFixed(1)} e ROE sólido.`,
                    relatedTicker: asset.ticker,
                    score: 75
                });
            }
        }

        // D. Variação Brusca Intraday
        if (asset.dailyChange && Math.abs(asset.dailyChange) > 3) {
            const isDrop = asset.dailyChange < 0;
            insights.push({
                id: `move-${asset.ticker}`,
                type: isDrop ? 'warning' : 'success',
                title: `Movimento Forte: ${asset.ticker}`,
                message: `${asset.ticker} ${isDrop ? 'caiu' : 'subiu'} ${Math.abs(asset.dailyChange).toFixed(2)}% hoje.`,
                relatedTicker: asset.ticker,
                score: 70
            });
        }
    });

    // 3. ANÁLISE DE CAIXA/FLUXO (Se houvesse saldo livre, mas aqui focamos na custódia)
    
    // Ordena por prioridade (Score maior primeiro) e pega top 5
    return insights.sort((a, b) => b.score - a.score).slice(0, 5);
};
