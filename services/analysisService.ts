
import { AssetPosition, PortfolioInsight, AssetType } from "../types";

/**
 * Analisa os dados da carteira e gera insights (Stories) aprimorados.
 */
export const analyzePortfolio = (
    portfolio: AssetPosition[], 
    ipca: number
): PortfolioInsight[] => {
    const insights: PortfolioInsight[] = [];
    const todayStr = new Date().toISOString().split('T')[0];

    if (!portfolio || portfolio.length === 0) return [];

    const createStory = (idSuffix: string, type: PortfolioInsight['type'], title: string, message: string, score: number, ticker?: string) => {
        insights.push({
            id: `story-${idSuffix}-${todayStr}`,
            type, title, message, relatedTicker: ticker, score, timestamp: Date.now(),
            url: ticker ? `https://investidor10.com.br/${ticker.endsWith('11') || ticker.endsWith('11B') ? 'fiis' : 'acoes'}/${ticker.toLowerCase()}/` : undefined
        });
    };

    let totalPortfolioValue = 0;
    const activeAssets = portfolio.map(p => {
        const val = (p.currentPrice || 0) * p.quantity;
        totalPortfolioValue += val;
        return { ...p, totalValue: val };
    });

    // 1. Defesa em Queda (Baixa Volatilidade em dia ruim)
    const marketDown = activeAssets.filter(a => (a.dailyChange || 0) < -0.5).length > activeAssets.length * 0.6;
    if (marketDown) {
        const defensive = activeAssets.find(a => (a.dailyChange || 0) >= 0 && (a.dy_12m || 0) > 6);
        if (defensive) {
            createStory('defense', 'success', 'Porto Seguro 🛡️', `Enquanto o mercado cai, ${defensive.ticker} se mantém estável. Ativos de valor protegem sua carteira.`, 95, defensive.ticker);
        }
    }

    // 2. Alerta de Sobrepreço (Valuation FIIs)
    const expensiveFii = activeAssets.find(a => a.assetType === AssetType.FII && (a.p_vp || 0) > 1.15 && a.totalValue > 1000);
    if (expensiveFii) {
        createStory('premium', 'warning', 'Ágio Elevado ⚠️', `O fundo ${expensiveFii.ticker} está negociando a ${(expensiveFii.p_vp || 0).toFixed(2)}x do VP. Cuidado ao aportar com ágio alto.`, 88, expensiveFii.ticker);
    }

    // 3. Yield vs Inflação (Crescimento Real)
    const realGainers = activeAssets.filter(a => (a.dy_12m || 0) > ipca + 3); // 3% spread real
    if (realGainers.length > 0) {
        const best = realGainers.sort((a,b) => (b.dy_12m || 0) - (a.dy_12m || 0))[0];
        createStory('real-yield', 'opportunity', 'Ganho Real 📈', `${best.ticker} entrega Yield de ${(best.dy_12m || 0).toFixed(1)}%, batendo a inflação (${ipca}%) com folga.`, 92, best.ticker);
    }

    // 4. Concentração Excessiva
    if (totalPortfolioValue > 0) {
        const concentrated = activeAssets.find(a => (a.totalValue / totalPortfolioValue) > 0.30);
        if (concentrated) {
            const pct = ((concentrated.totalValue / totalPortfolioValue) * 100).toFixed(0);
            createStory('concent', 'warning', 'Risco: Concentração', `${concentrated.ticker} representa ${pct}% do seu capital. Um problema aqui impactaria muito seu patrimônio.`, 85, concentrated.ticker);
        }
    }

    // 5. Oportunidade de Rebalanceamento (FII Descontado e Bom Pagador)
    const opportunities = activeAssets.filter(a => a.assetType === AssetType.FII && (a.p_vp || 0) > 0.8 && (a.p_vp || 0) < 0.98 && (a.dy_12m || 0) > 9);
    if (opportunities.length > 0) {
        const opp = opportunities[0];
        createStory('discount', 'opportunity', 'Desconto & Renda', `${opp.ticker} une o útil ao agradável: DY de ${(opp.dy_12m || 0).toFixed(1)}% e desconto patrimonial.`, 90, opp.ticker);
    }

    return insights.sort((a, b) => b.score - a.score).slice(0, 8);
};
