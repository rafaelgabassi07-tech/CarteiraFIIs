
import { AssetPosition, PortfolioInsight, MarketOverview, MarketAsset } from "../types";

/**
 * Analisa os dados de mercado e gera Stories de destaque.
 * Focado estritamente em Rankings: Maior Alta, Maior Baixa, Maior DY, Melhor P/VP e ROE.
 */
export const analyzePortfolio = (
    portfolio: AssetPosition[], // Mantido para contexto (ex: se o usuário tem o ativo)
    ipca: number,
    marketData?: MarketOverview
): PortfolioInsight[] => {
    const insights: PortfolioInsight[] = [];
    const now = Date.now();
    const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD para ID estável no dia
    
    // Se não houver dados de mercado, não gera stories
    if (!marketData || marketData.error) return [];

    const { fiis, stocks } = marketData.highlights;

    // Helper para criar Stories
    const createStory = (
        asset: MarketAsset, 
        type: 'volatility_up' | 'volatility_down' | 'opportunity' | 'success' | 'warning' | 'neutral', 
        title: string, 
        message: string, 
        scoreBase: number
    ) => {
        const isInWallet = portfolio.some(p => p.ticker === asset.ticker);
        const finalScore = scoreBase + (isInWallet ? 20 : 0); // Prioriza se o usuário tem na carteira
        
        // ID Determinístico: Ticker + Tipo + Data. 
        // Garante que se o usuário viu hoje, não vê de novo, mas vê amanhã se persistir.
        const stableId = `story-${asset.ticker}-${type}-${todayStr}`;

        insights.push({
            id: stableId,
            type,
            title,
            message,
            relatedTicker: asset.ticker,
            score: finalScore,
            timestamp: now,
            // URL para análise externa se quiser
            url: `https://investidor10.com.br/${asset.ticker.endsWith('11') || asset.ticker.endsWith('11B') ? 'fiis' : 'acoes'}/${asset.ticker.toLowerCase()}/`
        });
    };

    // --- 1. MAIORES ALTAS (FIIs & Ações) ---
    if (fiis.gainers.length > 0) {
        const top = fiis.gainers[0];
        if ((top.variation_percent || 0) > 0.5) {
            createStory(top, 'volatility_up', 'Campeão do Dia (FII)', 
                `O ${top.ticker} lidera as altas dos FIIs com uma valorização de ${top.variation_percent?.toFixed(2)}% hoje.`, 100);
        }
    }
    if (stocks.gainers.length > 0) {
        const top = stocks.gainers[0];
        if ((top.variation_percent || 0) > 1.0) {
            createStory(top, 'volatility_up', 'Destaque de Alta (Ação)', 
                `A ação ${top.ticker} está disparando ${top.variation_percent?.toFixed(2)}% no pregão de hoje.`, 99);
        }
    }

    // --- 2. MAIORES BAIXAS (Oportunidade ou Alerta) ---
    if (fiis.losers.length > 0) {
        const bottom = fiis.losers[0];
        if ((bottom.variation_percent || 0) < -0.5) {
            createStory(bottom, 'volatility_down', 'Maior Queda (FII)', 
                `O ${bottom.ticker} registra a maior desvalorização entre os FIIs monitorados: ${bottom.variation_percent?.toFixed(2)}%.`, 90);
        }
    }
    if (stocks.losers.length > 0) {
        const bottom = stocks.losers[0];
        if ((bottom.variation_percent || 0) < -1.0) {
            createStory(bottom, 'volatility_down', 'Queda Expressiva', 
                `Atenção para ${bottom.ticker}, caindo ${bottom.variation_percent?.toFixed(2)}% hoje.`, 89);
        }
    }

    // --- 3. REIS DOS DIVIDENDOS (High Yield) ---
    // Filtra DYs absurdos (> 30%) que podem ser erro de dados ou amortização
    const validFiiYield = fiis.high_yield.filter(a => (a.dy_12m || 0) < 30 && (a.dy_12m || 0) > 6);
    if (validFiiYield.length > 0) {
        const top = validFiiYield[0];
        createStory(top, 'success', 'Pagador de Elite', 
            `${top.ticker} está entregando um Dividend Yield impressionante de ${top.dy_12m?.toFixed(2)}% nos últimos 12 meses.`, 95);
    }

    const validStockYield = stocks.high_yield.filter(a => (a.dy_12m || 0) < 30 && (a.dy_12m || 0) > 6);
    if (validStockYield.length > 0) {
        const top = validStockYield[0];
        createStory(top, 'success', 'Dividendos Altos', 
            `Entre as ações, ${top.ticker} destaca-se com DY anualizado de ${top.dy_12m?.toFixed(2)}%.`, 94);
    }

    // --- 4. OPORTUNIDADES DE VALUATION (P/VP & P/L) ---
    // FIIs Baratos (P/VP < 1 mas > 0.5 para evitar "quebrados")
    const cheapFii = fiis.discounted.filter(a => (a.p_vp || 0) > 0.5 && (a.p_vp || 0) < 0.95 && (a.dy_12m || 0) > 8)[0];
    if (cheapFii) {
        createStory(cheapFii, 'opportunity', 'Desconto & Renda', 
            `${cheapFii.ticker} negocia abaixo do valor patrimonial (P/VP ${cheapFii.p_vp?.toFixed(2)}) e paga DY de ${cheapFii.dy_12m?.toFixed(1)}%.`, 85);
    }

    // Ações Baratas (P/L baixo e ROE decente)
    // Precisamos buscar na lista RAW ou DISCOUNTED
    const cheapStock = stocks.discounted.find(a => (a.p_l || 0) > 0 && (a.p_l || 0) < 6 && (a.roe || 0) > 15);
    if (cheapStock) {
        createStory(cheapStock, 'opportunity', 'Ação Descontada', 
            `${cheapStock.ticker} está com P/L de ${cheapStock.p_l?.toFixed(1)}x e entrega um ROE sólido de ${cheapStock.roe?.toFixed(1)}%.`, 84);
    }

    // --- 5. CAMPEÕES DE EFICIÊNCIA (ROE) ---
    // Busca na lista RAW se disponível, ou assume que os dados vieram no MarketOverview
    const rawStocks = stocks.raw || [];
    const bestRoe = [...rawStocks].sort((a, b) => (b.roe || 0) - (a.roe || 0))[0];
    if (bestRoe && (bestRoe.roe || 0) > 20) {
        createStory(bestRoe, 'success', 'Máquina de Lucro', 
            `${bestRoe.ticker} apresenta um ROE excepcional de ${bestRoe.roe?.toFixed(1)}%, indicando alta eficiência.`, 80);
    }

    const rawFiis = fiis.raw || [];
    const bestFiiRoe = [...rawFiis].sort((a, b) => (b.roe || 0) - (a.roe || 0))[0];
    if (bestFiiRoe && (bestFiiRoe.roe || 0) > 15) {
        createStory(bestFiiRoe, 'success', 'Rentabilidade FII', 
            `${bestFiiRoe.ticker} lidera em rentabilidade sobre patrimônio com ROE de ${bestFiiRoe.roe?.toFixed(1)}%.`, 79);
    }

    // --- 6. ALERTA DE FLUXO (Volume) ---
    const topVolume = [...rawStocks].sort((a, b) => (b.liquidity || 0) - (a.liquidity || 0))[0];
    if (topVolume) {
        createStory(topVolume, 'neutral', 'Alta Liquidez', 
            `${topVolume.ticker} é o ativo mais negociado da nossa lista, com volume diário superior a R$ ${( (topVolume.liquidity||0)/1000000 ).toFixed(0)} Milhões.`, 60);
    }

    // Ordenação Final: Score Decrescente
    return insights.sort((a, b) => b.score - a.score).slice(0, 15);
};
