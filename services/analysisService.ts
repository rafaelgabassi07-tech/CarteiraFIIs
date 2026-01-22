
import { AssetPosition, PortfolioInsight, AssetType, NewsItem } from "../types";

/**
 * O "Cérebro" do App.
 * Analisa a carteira do usuário e gera insights baseados em:
 * 1. Oscilações Bruscas (Intraday)
 * 2. Notícias Relevantes (Últimas 24h)
 * 3. Análise Fundamentalista (P/VP, Vacância, etc.)
 */
export const analyzePortfolio = (portfolio: AssetPosition[], ipca: number, news: NewsItem[] = []): PortfolioInsight[] => {
    const insights: PortfolioInsight[] = [];
    const now = Date.now();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    
    if (portfolio.length === 0 && news.length === 0) return [];

    const totalBalance = portfolio.reduce((acc, p) => acc + (p.currentPrice || p.averagePrice) * p.quantity, 0);
    
    // --- 1. OSCILAÇÕES BRUSCAS (Prioridade Máxima) ---
    // Detecta variações diárias > 1.5% (Positivas ou Negativas)
    portfolio.forEach(asset => {
        const change = asset.dailyChange || 0;
        const absChange = Math.abs(change);
        
        // Threshold de 1.5% para ser considerado "Brusco"
        if (absChange >= 1.5) {
            const isPositive = change > 0;
            insights.push({
                id: `vol-${asset.ticker}-${now}`, // ID único diário
                type: isPositive ? 'volatility_up' : 'volatility_down',
                title: isPositive ? `${asset.ticker} Subindo` : `${asset.ticker} Caindo`,
                message: `${asset.ticker} está com variação de ${isPositive ? '+' : ''}${change.toFixed(2)}% hoje. ${isPositive ? 'Excelente momento!' : 'Atenção ao mercado.'}`,
                relatedTicker: asset.ticker,
                score: 100 + absChange, // Quanto maior a variação, maior o score (aparece primeiro)
                timestamp: now
            });
        }
    });

    // --- 2. NOTÍCIAS RELEVANTES (Últimas 24h) ---
    // Filtra notícias que mencionam ativos da carteira ou são Macro (FIIs/Ações)
    const portfolioTickers = new Set(portfolio.map(p => p.ticker));
    
    news.forEach(item => {
        // Verifica se é recente (parsing da string de data relativa ou uso de timestamp se disponível)
        // Como o app usa 'há x horas', assumimos que a API News já retorna ordenado.
        // Vamos considerar as top news como recentes.
        
        // Tenta associar notícia a um ativo da carteira
        let relatedTicker = undefined;
        let score = 50;

        // Se o título menciona um ticker da carteira
        portfolio.forEach(asset => {
            if (item.title.toUpperCase().includes(asset.ticker) || item.summary.toUpperCase().includes(asset.ticker)) {
                relatedTicker = asset.ticker;
                score = 90; // Notícia direta sobre ativo da carteira tem prioridade alta
            }
        });

        // Se não tem ticker, mas é Macro importante
        if (!relatedTicker) {
            if (item.category === 'Macro' || item.title.includes('IPCA') || item.title.includes('Selic') || item.title.includes('IFIX')) {
                score = 85;
            } else {
                score = 40; // Notícia geral
            }
        }

        insights.push({
            id: `news-${item.id}`,
            type: 'news',
            title: relatedTicker || item.source,
            message: item.title,
            relatedTicker: relatedTicker, // Pode ser undefined
            url: item.url,
            imageUrl: item.imageUrl,
            score: score,
            timestamp: now
        });
    });

    // --- 3. ANÁLISE FUNDAMENTALISTA (Baixa Prioridade - Educativo) ---
    // Só gera se não houver muitos eventos urgentes
    
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

    // Alerta de Vacância (FIIs) - CRÍTICO
    portfolio.forEach(asset => {
        if (asset.assetType === AssetType.FII && asset.vacancy !== undefined && asset.vacancy > 15) {
            insights.push({
                id: `vac-${asset.ticker}`,
                type: 'warning',
                title: `Risco: Vacância`,
                message: `${asset.ticker} reportou ${asset.vacancy}% de vacância física. Fique atento.`,
                relatedTicker: asset.ticker,
                score: 75
            });
        }
        
        // Oportunidade
        if (asset.assetType === AssetType.FII && asset.p_vp && asset.p_vp < 0.85 && asset.dy_12m && asset.dy_12m > 9) {
             insights.push({
                id: `opp-${asset.ticker}`,
                type: 'opportunity',
                title: 'Oportunidade',
                message: `${asset.ticker} está descontado (P/VP ${asset.p_vp}) com alto Yield.`,
                relatedTicker: asset.ticker,
                score: 70
            });
        }
    });

    // Inflação (Ocasional)
    if (ipca > 0 && portfolioDy < ipca) {
        insights.push({
            id: 'inflation-loss',
            type: 'warning',
            title: 'Inflação Alta',
            message: `Sua carteira rende ${portfolioDy.toFixed(2)}%, abaixo do IPCA (${ipca.toFixed(2)}%).`,
            score: 60
        });
    }

    // --- FILTRAGEM FINAL ---
    // 1. Ordena por Score (Decrescente)
    // 2. Limita a 15 itens
    return insights
        .sort((a, b) => b.score - a.score)
        .slice(0, 15);
};
