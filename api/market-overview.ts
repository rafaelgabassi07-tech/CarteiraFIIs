
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import https from 'https';
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURAÇÃO SUPABASE ---
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

const httpsAgent = new https.Agent({ 
    keepAlive: true, 
    rejectUnauthorized: false 
});

// --- DADOS DE EMERGÊNCIA (Fallback apenas se DB estiver vazio) ---
const EMERGENCY_DATA: Record<string, any> = {
    // === FIIs ===
    'MXRF11': { name: 'Maxi Renda', type: 'FII', segment: 'Híbrido', p_vp: 1.01, dy_12m: 12.45, price: 10.35, liquidity: 12000000, roe: 12.5, net_margin: 95.0, cagr_revenue: 10.5, variation_percent: 0 },
    'HGLG11': { name: 'CSHG Logística', type: 'FII', segment: 'Logística', p_vp: 1.05, dy_12m: 8.90, price: 165.50, liquidity: 8500000, roe: 9.2, net_margin: 78.0, cagr_revenue: 6.5, variation_percent: 0 },
    // ... (Mantendo estrutura mínima para evitar crash total se DB falhar)
    'VALE3': { name: 'Vale', type: 'ACAO', segment: 'Mineração', p_l: 5.2, p_vp: 1.4, dy_12m: 8.2, price: 62.10, liquidity: 1200000000, roe: 22.0, net_margin: 20.0, cagr_revenue: 8.0, variation_percent: 0 },
    'PETR4': { name: 'Petrobras', type: 'ACAO', segment: 'Petróleo e Gás', p_l: 3.5, p_vp: 0.9, dy_12m: 18.5, price: 38.50, liquidity: 1500000000, roe: 28.5, net_margin: 25.0, cagr_revenue: 15.0, variation_percent: 0 }
};

async function getMarketData() {
    try {
        // 1. Tenta buscar dados reais do banco de dados (Populado pelo Crawler)
        const { data: dbAssets, error } = await supabase
            .from('ativos_metadata')
            .select('*');

        if (!error && dbAssets && dbAssets.length > 5) {
            const realData: Record<string, any> = {};
            
            dbAssets.forEach((asset: any) => {
                // Normaliza dados do DB para o formato da UI
                realData[asset.ticker] = {
                    ticker: asset.ticker,
                    name: asset.ticker, // Nome simplificado
                    type: asset.type,
                    segment: asset.segment || 'Geral',
                    // Prioriza preço atualizado
                    price: asset.current_price || asset.cotacao_atual || 0,
                    // Indicadores
                    p_vp: asset.pvp || 0,
                    p_l: asset.pl || 0,
                    dy_12m: asset.dy_12m || 0,
                    roe: asset.roe || 0,
                    net_margin: asset.margem_liquida || 0,
                    cagr_revenue: asset.cagr_receita || 0,
                    
                    // Tratamento de Liquidez (pode vir string ou number)
                    liquidity: typeof asset.liquidez === 'string' 
                        ? parseFloat(asset.liquidez.replace(/\./g, '').replace(',', '.')) 
                        : (asset.liquidez || 0),
                        
                    // Variação não é salva no histórico, usamos 0 ou fallback
                    // (Isso corrigirá o PREÇO, que é a reclamação principal)
                    variation_percent: 0 
                };
            });
            return realData;
        }

        // 2. Se DB vazio ou erro, usa fallback
        console.warn("DB Market Data empty or error, using fallback.");
        return EMERGENCY_DATA;
    } catch (e) {
        console.error("Market fetch error:", e);
        return EMERGENCY_DATA;
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

    try {
        const rawData = await getMarketData();
        
        const fiis = Object.values(rawData).filter((v: any) => v.type === 'FII');
        const stocks = Object.values(rawData).filter((v: any) => v.type === 'ACAO' || v.type === 'BDR');

        // Helper de ordenação seguro
        const safeSort = (arr: any[], key: string, order: 'asc' | 'desc') => {
            return [...arr].sort((a, b) => {
                const valA = a[key] || 0;
                const valB = b[key] || 0;
                return order === 'desc' ? valB - valA : valA - valB;
            });
        };

        const processList = (list: any[]) => ({
            // Como variação pode ser 0 no DB, o ranking de altas/baixas pode ficar estático,
            // mas P/VP, DY e Preço estarão corretos.
            gainers: safeSort(list, 'variation_percent', 'desc').slice(0, 10),
            losers: safeSort(list, 'variation_percent', 'asc').slice(0, 10),
            high_yield: safeSort(list, 'dy_12m', 'desc').slice(0, 20),
            discounted: list
                .filter(a => a.type === 'FII' ? (a.p_vp > 0 && a.p_vp < 1) : (a.p_l > 0 && a.p_l < 10))
                .sort((a, b) => a.type === 'FII' ? a.p_vp - b.p_vp : a.p_l - b.p_l)
                .slice(0, 20),
            raw: list
        });

        const responseData = {
            market_status: new Date().getHours() >= 10 && new Date().getHours() < 17 && new Date().getDay() > 0 && new Date().getDay() < 6 ? 'Mercado Aberto' : 'Mercado Fechado',
            last_update: new Date().toISOString(),
            highlights: {
                fiis: processList(fiis),
                stocks: processList(stocks)
            }
        };

        return res.status(200).json(responseData);
    } catch (error: any) {
        return res.status(500).json({ 
            error: true, 
            message: 'Erro interno ao processar dados de mercado',
            details: error.message 
        });
    }
}
