
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURAÇÃO SUPABASE ---
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

// --- DADOS DE EMERGÊNCIA (Fallback & Seed) ---
const EMERGENCY_DATA: Record<string, any> = {
    'MXRF11': { name: 'Maxi Renda', type: 'FII', p_vp: 1.01, dy_12m: 12.45, price: 10.35, liquidity: 12000000, roe: 12.5, net_margin: 95.0, cagr_revenue: 10.5, variation_percent: 0.15 },
    'HGLG11': { name: 'CSHG Logística', type: 'FII', p_vp: 1.05, dy_12m: 8.90, price: 165.50, liquidity: 8500000, roe: 9.2, net_margin: 78.0, cagr_revenue: 6.5, variation_percent: -0.20 },
    'VISC11': { name: 'Vinci Shopping', type: 'FII', p_vp: 0.98, dy_12m: 9.20, price: 120.10, liquidity: 5000000, roe: 8.8, net_margin: 65.0, cagr_revenue: 7.2, variation_percent: 0.50 },
    'XPLG11': { name: 'XP Log', type: 'FII', p_vp: 0.92, dy_12m: 9.50, price: 105.80, liquidity: 6000000, roe: 9.0, net_margin: 75.0, cagr_revenue: 5.8, variation_percent: 0.10 },
    'KNRI11': { name: 'Kinea Renda', type: 'FII', p_vp: 1.00, dy_12m: 8.80, price: 160.00, liquidity: 4500000, roe: 8.5, net_margin: 80.0, cagr_revenue: 4.5, variation_percent: 0.00 },
    'CPTS11': { name: 'Capitânia', type: 'FII', p_vp: 0.89, dy_12m: 11.50, price: 8.50, liquidity: 9000000, roe: 11.0, net_margin: 92.0, cagr_revenue: 12.0, variation_percent: 0.35 },
    'XPML11': { name: 'XP Malls', type: 'FII', p_vp: 1.02, dy_12m: 8.50, price: 115.20, liquidity: 7000000, roe: 9.5, net_margin: 68.0, cagr_revenue: 8.0, variation_percent: 0.22 },
    'BTLG11': { name: 'BTG Logística', type: 'FII', p_vp: 0.99, dy_12m: 9.10, price: 102.50, liquidity: 6500000, roe: 9.8, net_margin: 76.0, cagr_revenue: 6.0, variation_percent: -0.15 },
    'IRDM11': { name: 'Iridium', type: 'FII', p_vp: 0.78, dy_12m: 13.20, price: 72.30, liquidity: 5500000, roe: 10.5, net_margin: 94.0, cagr_revenue: 9.5, variation_percent: -0.50 },
    'HGRU11': { name: 'CSHG Renda Urbana', type: 'FII', p_vp: 1.03, dy_12m: 8.70, price: 132.40, liquidity: 4000000, roe: 9.0, net_margin: 82.0, cagr_revenue: 5.5, variation_percent: 0.12 },
    'PETR4': { name: 'Petrobras', type: 'ACAO', p_l: 3.5, p_vp: 0.9, dy_12m: 18.5, price: 38.50, liquidity: 1500000000, roe: 28.5, net_margin: 25.0, cagr_revenue: 15.0, variation_percent: 1.20 },
    'VALE3': { name: 'Vale', type: 'ACAO', p_l: 5.2, p_vp: 1.4, dy_12m: 8.2, price: 62.10, liquidity: 1200000000, roe: 22.0, net_margin: 20.0, cagr_revenue: 8.0, variation_percent: -0.50 },
    'ITUB4': { name: 'Itaú Unibanco', type: 'ACAO', p_l: 8.5, p_vp: 1.6, dy_12m: 5.5, price: 34.20, liquidity: 800000000, roe: 18.5, net_margin: 18.0, cagr_revenue: 10.0, variation_percent: 0.80 },
    'BBDC4': { name: 'Bradesco', type: 'ACAO', p_l: 9.2, p_vp: 0.95, dy_12m: 6.8, price: 13.50, liquidity: 600000000, roe: 12.0, net_margin: 14.0, cagr_revenue: 5.0, variation_percent: 0.30 },
    'BBAS3': { name: 'Banco do Brasil', type: 'ACAO', p_l: 4.5, p_vp: 0.85, dy_12m: 9.5, price: 27.80, liquidity: 500000000, roe: 20.0, net_margin: 22.0, cagr_revenue: 12.0, variation_percent: 0.60 },
    'WEGE3': { name: 'WEG', type: 'ACAO', p_l: 28.0, p_vp: 5.5, dy_12m: 1.8, price: 40.50, liquidity: 400000000, roe: 25.0, net_margin: 16.0, cagr_revenue: 18.0, variation_percent: 1.50 },
    'PRIO3': { name: 'PetroRio', type: 'ACAO', p_l: 7.8, p_vp: 2.2, dy_12m: 0.0, price: 45.00, liquidity: 350000000, roe: 30.0, net_margin: 40.0, cagr_revenue: 25.0, variation_percent: 2.00 },
    'ELET3': { name: 'Eletrobras', type: 'ACAO', p_l: 15.0, p_vp: 0.7, dy_12m: 2.5, price: 38.00, liquidity: 300000000, roe: 5.0, net_margin: 10.0, cagr_revenue: 4.0, variation_percent: -0.40 },
    'ABEV3': { name: 'Ambev', type: 'ACAO', p_l: 13.5, p_vp: 2.5, dy_12m: 5.8, price: 12.50, liquidity: 250000000, roe: 18.0, net_margin: 22.0, cagr_revenue: 8.0, variation_percent: 0.10 },
    'RENT3': { name: 'Localiza', type: 'ACAO', p_l: 18.0, p_vp: 2.8, dy_12m: 2.2, price: 48.00, liquidity: 200000000, roe: 15.0, net_margin: 12.0, cagr_revenue: 20.0, variation_percent: 0.90 }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

    try {
        // 1. Tenta buscar dados reais do banco de dados
        const { data: dbData, error } = await supabase
            .from('ativos_metadata')
            .select('*');

        let rawList: any[] = [];

        // SE O BANCO ESTIVER VAZIO, FAZ O SEED AUTOMÁTICO
        if (!error && (!dbData || dbData.length === 0)) {
            console.log("Banco vazio detectado. Iniciando Auto-Seed...");
            
            const seedPayload = Object.entries(EMERGENCY_DATA).map(([ticker, v]) => ({
                ticker: ticker,
                type: v.type,
                // Mapeia campos do formato estático para o formato DB
                current_price: v.price, // Mapeia 'price' para 'current_price' do DB (ou 'cotacao_atual' dependendo do schema exato, aqui assumindo consistencia com update-stock)
                // Ajuste para schema do DB: update-stock usa 'cotacao_atual', mas vamos usar as chaves que o scraper usa
                cotacao_atual: v.price,
                valor_mercado: v.price * 10000000, // Simulação
                pvp: v.p_vp,
                pl: v.p_l,
                dy_12m: v.dy_12m,
                roe: v.roe,
                margem_liquida: v.net_margin,
                cagr_receita: v.cagr_revenue,
                liquidez: String(v.liquidity),
                updated_at: new Date().toISOString()
            }));

            // Insere no banco
            const { error: seedError } = await supabase.from('ativos_metadata').upsert(seedPayload);
            
            if (seedError) {
                console.error("Erro no Auto-Seed:", seedError);
                // Se falhar o insert (ex: tabela não existe), usa lista de memória
                rawList = Object.entries(EMERGENCY_DATA).map(([k, v]) => ({ ticker: k, ...v }));
            } else {
                // Se der sucesso, usa a lista formatada
                rawList = seedPayload.map(item => ({
                    ticker: item.ticker,
                    name: item.ticker,
                    type: item.type,
                    price: item.cotacao_atual,
                    p_vp: item.pvp,
                    p_l: item.pl,
                    dy_12m: item.dy_12m,
                    roe: item.roe,
                    net_margin: item.margem_liquida,
                    cagr_revenue: item.cagr_receita,
                    liquidity: typeof item.liquidez === 'string' ? parseFloat(item.liquidez) : item.liquidez,
                    variation_percent: 0 
                }));
            }
        } 
        else if (dbData && dbData.length > 0) {
            // Se já tem dados, usa eles
            rawList = dbData.map((item: any) => ({
                ticker: item.ticker,
                name: item.ticker,
                type: item.type || (item.ticker.endsWith('11') ? 'FII' : 'ACAO'),
                price: item.valor_mercado || item.cotacao_atual || item.current_price || 0,
                p_vp: Number(item.pvp) || 0,
                p_l: Number(item.pl) || 0,
                dy_12m: Number(item.dy_12m) || 0,
                roe: Number(item.roe) || 0,
                net_margin: Number(item.margem_liquida) || 0,
                cagr_revenue: Number(item.cagr_receita) || 0,
                liquidity: typeof item.liquidez === 'string' ? parseFloat(item.liquidez.replace(/[^0-9.]/g, '')) : Number(item.liquidez) || 0,
                variation_percent: 0
            }));
        } else {
            // Fallback final
            rawList = Object.entries(EMERGENCY_DATA).map(([k, v]) => ({ ticker: k, ...v }));
        }

        // Separação por tipo
        const fiis = rawList.filter(a => a.type === 'FII' || a.ticker.endsWith('11') || a.ticker.endsWith('11B'));
        const stocks = rawList.filter(a => a.type === 'ACAO' || (!a.ticker.endsWith('11') && !a.ticker.endsWith('11B')));

        const processList = (list: any[]) => ({
            gainers: [...list].sort((a, b) => (b.variation_percent || 0) - (a.variation_percent || 0)).slice(0, 10),
            losers: [...list].sort((a, b) => (a.variation_percent || 0) - (b.variation_percent || 0)).slice(0, 10),
            high_yield: [...list].sort((a, b) => (b.dy_12m || 0) - (a.dy_12m || 0)).slice(0, 20),
            discounted: [...list]
                .filter(a => {
                    const isFii = a.type === 'FII';
                    if (isFii) return (a.p_vp || 0) > 0 && (a.p_vp || 0) < 1;
                    return (a.p_l || 0) > 0 && (a.p_l || 0) < 10;
                })
                .sort((a, b) => {
                    const valA = a.type === 'FII' ? a.p_vp : a.p_l;
                    const valB = b.type === 'FII' ? b.p_vp : b.p_l;
                    return valA - valB;
                })
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
        return res.status(200).json({ 
            error: true, 
            message: 'Erro interno ao processar dados de mercado',
            details: error.message 
        });
    }
}
