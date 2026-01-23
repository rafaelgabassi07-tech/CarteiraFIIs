
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY || ''
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    
    // Cache de 10 minutos para não sobrecarregar o banco
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        // 1. Buscar Ações descontadas (P/L > 0 e baixo, P/VP razoável)
        const { data: stocks, error: stockError } = await supabase
            .from('ativos_metadata')
            .select('ticker, segment, pl, pvp, current_price, dy_12m')
            .eq('type', 'ACAO')
            .gt('pl', 0.1) // Filtra P/L negativo ou zero
            .lt('pl', 15)  // P/L atrativo
            .lt('pvp', 2.0)
            .order('pl', { ascending: true }) // Menores P/Ls primeiro
            .limit(20);

        if (stockError) throw stockError;

        // 2. Buscar FIIs de Renda (DY alto, P/VP próximo de 1)
        const { data: fiis, error: fiiError } = await supabase
            .from('ativos_metadata')
            .select('ticker, segment, dy_12m, pvp, current_price')
            .eq('type', 'FII')
            .gt('dy_12m', 6)  // Mínimo de yield
            .lt('dy_12m', 25) // Filtra distorções muito altas
            .gt('pvp', 0.8)   // Evita fundos muito descontados (risco)
            .lt('pvp', 1.1)   // Preço justo
            .order('dy_12m', { ascending: false }) // Maiores DYs primeiro
            .limit(20);

        if (fiiError) throw fiiError;

        // Formatação
        const discountedStocks = (stocks || []).slice(0, 10).map(s => ({
            ticker: s.ticker,
            name: s.segment || 'Ação',
            price: s.current_price || 0,
            p_l: s.pl,
            p_vp: s.pvp,
            dy_12m: s.dy_12m
        }));

        const highYieldFiis = (fiis || []).slice(0, 10).map(f => ({
            ticker: f.ticker,
            name: f.segment || 'FII',
            price: f.current_price || 0,
            p_vp: f.pvp,
            dy_12m: f.dy_12m
        }));

        const response = {
            market_status: "Aberto",
            sentiment_summary: "Análise Quantitativa",
            last_update: new Date().toISOString(),
            highlights: {
                discounted_fiis: highYieldFiis, // Reusing high yield logic for FIIs as discount logic is similar (PVP~1)
                discounted_stocks: discountedStocks,
                top_gainers: [], // Cannot compute without historical data easily
                top_losers: [],
                high_dividend_yield: highYieldFiis
            },
            sources: [
                { title: 'Investidor10 (Scraper)', uri: 'https://investidor10.com.br' }
            ]
        };

        return res.status(200).json(response);

    } catch (error: any) {
        console.error('Market Overview Error:', error);
        return res.status(500).json({ 
            error: true, 
            message: "Erro ao consultar base de dados.",
            details: error.message 
        });
    }
}
