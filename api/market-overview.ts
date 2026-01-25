
import type { VercelRequest, VercelResponse } from '@vercel/node';
import https from 'https';
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURAÇÃO SUPABASE SEGURA ---
// Usa valores placeholder para evitar crash "supabaseUrl required" na inicialização se ENV estiver faltando
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY || 'placeholder';

const supabase = createClient(supabaseUrl, supabaseKey);

const httpsAgent = new https.Agent({ 
    keepAlive: true, 
    rejectUnauthorized: false 
});

// --- DADOS DE EMERGÊNCIA (Fallback) ---
const EMERGENCY_DATA: Record<string, any> = {
    'MXRF11': { ticker: 'MXRF11', name: 'Maxi Renda', type: 'FII', segment: 'Híbrido', p_vp: 1.01, dy_12m: 12.45, price: 10.35, liquidity: 12000000, variation_percent: 0 },
    'VALE3': { ticker: 'VALE3', name: 'Vale', type: 'ACAO', segment: 'Mineração', p_l: 5.2, p_vp: 1.4, dy_12m: 8.2, price: 62.10, liquidity: 1200000000, variation_percent: 0 },
    'PETR4': { ticker: 'PETR4', name: 'Petrobras', type: 'ACAO', segment: 'Petróleo', p_l: 3.5, p_vp: 0.9, dy_12m: 18.5, price: 38.50, liquidity: 1500000000, variation_percent: 0 }
};

// Helper para garantir números
const parseNum = (val: any) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    try {
        const str = String(val).replace('R$', '').replace('%', '').trim();
        // Converte formato BR (1.000,00) para US (1000.00)
        if (str.includes(',') && !str.includes('.')) return parseFloat(str.replace(',', '.'));
        if (str.includes('.') && str.includes(',')) return parseFloat(str.replace(/\./g, '').replace(',', '.'));
        return parseFloat(str);
    } catch { return 0; }
};

async function getMarketData() {
    try {
        // Se estiver rodando sem chaves reais, cai direto pro fallback
        if (supabaseUrl.includes('placeholder')) {
            console.warn("Supabase keys missing, using fallback.");
            return EMERGENCY_DATA;
        }

        const { data: dbAssets, error } = await supabase
            .from('ativos_metadata')
            .select('*');

        if (!error && dbAssets && dbAssets.length > 0) {
            const realData: Record<string, any> = {};
            
            dbAssets.forEach((asset: any) => {
                realData[asset.ticker] = {
                    ticker: asset.ticker,
                    name: asset.ticker,
                    type: asset.type, // 'FII' ou 'ACAO'
                    segment: asset.segment || 'Geral',
                    
                    // Prioridade de preço
                    price: parseNum(asset.current_price || asset.cotacao_atual),
                    
                    // Indicadores normalizados
                    p_vp: parseNum(asset.pvp),
                    p_l: parseNum(asset.pl),
                    dy_12m: parseNum(asset.dy_12m || asset.dy),
                    roe: parseNum(asset.roe),
                    net_margin: parseNum(asset.margem_liquida),
                    cagr_revenue: parseNum(asset.cagr_receita),
                    liquidity: parseNum(asset.liquidez),
                    
                    // Extras FIIs
                    vacancy: parseNum(asset.vacancia),
                    assets_value: asset.patrimonio_liquido || 'N/A',
                    last_dividend: parseNum(asset.ultimo_rendimento),
                    
                    variation_percent: 0 // Placeholder seguro
                };
            });
            return realData;
        }
        // Se DB vazio, retorna fallback em vez de null
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
        // Fallback extra se getMarketData retornar algo inválido (ex: undefined)
        const safeData = rawData || EMERGENCY_DATA;
        const allAssets = Object.values(safeData);
        
        const fiis = allAssets.filter((v: any) => v.type === 'FII' || v.ticker.endsWith('11') || v.ticker.endsWith('11B'));
        const stocks = allAssets.filter((v: any) => !fiis.includes(v));

        const safeSort = (arr: any[], key: string, order: 'asc' | 'desc') => {
            return [...arr].sort((a, b) => {
                const valA = a[key] || 0;
                const valB = b[key] || 0;
                return order === 'desc' ? valB - valA : valA - valB;
            });
        };

        const processList = (list: any[]) => {
            const safeList = list || []; // Garante array
            return {
                gainers: safeSort(safeList, 'variation_percent', 'desc').slice(0, 10),
                losers: safeSort(safeList, 'variation_percent', 'asc').slice(0, 10),
                high_yield: safeSort(safeList, 'dy_12m', 'desc').slice(0, 20),
                discounted: safeList
                    .filter(a => (a.type === 'FII' ? (a.p_vp > 0 && a.p_vp < 1) : (a.p_l > 0 && a.p_l < 10)))
                    .sort((a, b) => (a.type === 'FII' ? a.p_vp - b.p_vp : a.p_l - b.p_l))
                    .slice(0, 20),
                raw: safeList
            };
        };

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
        console.error("API Critical Error:", error);
        return res.status(500).json({ 
            error: true, 
            message: 'Erro interno ao processar dados',
            details: error.message 
        });
    }
}
