
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
    
    // Verificação de segurança: Se portfolio não for array, retorna vazio
    if (!Array.isArray(portfolio)) return [];
    
    // Filtra ativos inválidos (sem ticker) para evitar erros
    const safePortfolio = portfolio.filter(p => p && p.ticker);

    if (safePortfolio.length === 0 && (!news || news.length === 0)) return [];

    const totalBalance = safePortfolio.reduce((acc, p) => acc + (p.currentPrice || p.averagePrice) * p.quantity, 0);
    
    // --- 1. OSCILAÇÕES BRUSCAS (Prioridade Máxima) ---
    // Detecta variações diárias > 1.5% (Positivas ou Negativas)
    safePortfolio.forEach(asset => {
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
                imageUrl: asset.logoUrl, // Usa a logo do ativo se existir
                score: 100 + absChange, // Quanto maior a variação, maior o score
                timestamp: now
            });
        }
    });

    // --- 2. NOTÍCIAS RELEVANTES (Últimas 24h) ---
    // Filtra notícias que mencionam ativos da carteira ou são Macro (FIIs/Ações)
    if (Array.isArray(news)) {
        news.forEach(item => {
            if (!item || !item.title) return;

            // Tenta associar notícia a um ativo da carteira
            let relatedTicker = undefined;
            let assetLogo = undefined;
            let score = 50;

            // Se o título menciona um ticker da carteira
            const matchedAsset = safePortfolio.find(asset => 
                (item.title && item.title.toUpperCase().includes(asset.ticker)) || 
                (item.summary && item.summary.toUpperCase().includes(asset.ticker))
            );

            if (matchedAsset) {
                relatedTicker = matchedAsset.ticker;
                assetLogo = matchedAsset.logoUrl;
                score = 90; // Notícia direta sobre ativo da carteira tem prioridade alta
            }

            // Se não tem ticker, mas é Macro importante
            if (!relatedTicker) {
                if (item.category === 'Macro' || (item.title && (item.title.includes('IPCA') || item.title.includes('Selic') || item.title.includes('IFIX')))) {
                    score = 85;
                } else {
                    score = 40; // Notícia geral
                }
            }

            insights.push({
                id: `news-${item.id}`,
                type: 'news',
                title: relatedTicker || item.source || 'Notícia',
                message: item.title,
                relatedTicker: relatedTicker, 
                url: item.url,
                // Prioriza imagem da notícia, se não tiver, tenta logo do ativo
                imageUrl: item.imageUrl || assetLogo, 
                score: score,
                timestamp: now
            });
        });
    }

    // --- 3. ANÁLISE FUNDAMENTALISTA (Baixa Prioridade - Educativo) ---
    
    // Cálculo do Yield Médio Ponderado da Carteira
    let weightedDySum = 0;
    
    safePortfolio.forEach(asset => {
        const val = (asset.currentPrice || 0) * asset.quantity;
        const dy = asset.dy_12m || 0;
        weightedDySum += (dy * val);
    });

    const portfolioDy = totalBalance > 0 ? weightedDySum / totalBalance : 0;

    // Alerta de Vacância (FIIs) - CRÍTICO
    safePortfolio.forEach(asset => {
        if (asset.assetType === AssetType.FII && asset.vacancy !== undefined && asset.vacancy > 15) {
            insights.push({
                id: `vac-${asset.ticker}`,
                type: 'warning',
                title: `Risco: Vacância`,
                message: `${asset.ticker} reportou ${asset.vacancy}% de vacância física. Fique atento.`,
                relatedTicker: asset.ticker,
                imageUrl: asset.logoUrl,
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
                imageUrl: asset.logoUrl,
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
