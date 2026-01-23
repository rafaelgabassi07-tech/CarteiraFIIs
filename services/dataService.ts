
import { DividendReceipt, AssetType, AssetFundamentals, MarketIndicators, MarketOverview, ScrapeResult, MarketAsset } from "../types";
import { supabase } from "./supabase";

export interface UnifiedMarketData {
  dividends: DividendReceipt[];
  metadata: Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }>;
  indicators?: MarketIndicators;
  error?: string;
}

// --- DADOS DE FALLBACK ROBUSTOS (Motor de Mercado Offline) ---
// Usados caso a API/Backend falhe ou esteja offline
const STATIC_MARKET_DATA: Record<string, any> = {
    // FIIs
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
    'MALL11': { name: 'Genial Malls', type: 'FII', p_vp: 0.95, dy_12m: 9.50, price: 112.00, liquidity: 3000000, roe: 9.2, net_margin: 70.0, cagr_revenue: 6.8, variation_percent: 0.40 },
    'TGAR11': { name: 'TG Ativo Real', type: 'FII', p_vp: 0.94, dy_12m: 12.80, price: 118.50, liquidity: 3500000, roe: 13.0, net_margin: 85.0, cagr_revenue: 11.0, variation_percent: 0.25 },
    'VGHF11': { name: 'Valora Hedge', type: 'FII', p_vp: 0.92, dy_12m: 13.50, price: 9.10, liquidity: 3000000, roe: 14.0, net_margin: 90.0, cagr_revenue: 10.0, variation_percent: 0.10 },
    'VGIR11': { name: 'Valora RE', type: 'FII', p_vp: 0.98, dy_12m: 13.00, price: 9.75, liquidity: 2500000, roe: 13.5, net_margin: 92.0, cagr_revenue: 9.0, variation_percent: -0.05 },
    'KNSC11': { name: 'Kinea Securities', type: 'FII', p_vp: 0.96, dy_12m: 11.00, price: 9.20, liquidity: 3200000, roe: 11.5, net_margin: 88.0, cagr_revenue: 8.5, variation_percent: 0.18 },
    'RBRR11': { name: 'RBR Rendimento', type: 'FII', p_vp: 0.95, dy_12m: 10.50, price: 90.50, liquidity: 2800000, roe: 10.0, net_margin: 85.0, cagr_revenue: 7.0, variation_percent: -0.10 },
    'RECR11': { name: 'Rec Recebíveis', type: 'FII', p_vp: 0.93, dy_12m: 11.80, price: 85.00, liquidity: 4000000, roe: 12.0, net_margin: 90.0, cagr_revenue: 9.5, variation_percent: 0.30 },
    'BRCO11': { name: 'Bresco Logística', type: 'FII', p_vp: 1.04, dy_12m: 8.50, price: 125.00, liquidity: 2000000, roe: 8.0, net_margin: 75.0, cagr_revenue: 5.0, variation_percent: 0.05 },
    'PVBI11': { name: 'VBI Prime', type: 'FII', p_vp: 0.98, dy_12m: 8.20, price: 101.50, liquidity: 2500000, roe: 7.8, net_margin: 72.0, cagr_revenue: 4.8, variation_percent: 0.15 },
    'LVBI11': { name: 'VBI Logística', type: 'FII', p_vp: 0.97, dy_12m: 8.90, price: 114.00, liquidity: 2200000, roe: 8.5, net_margin: 76.0, cagr_revenue: 6.2, variation_percent: -0.08 },
    'JSRE11': { name: 'JS Real Estate', type: 'FII', p_vp: 0.65, dy_12m: 7.50, price: 70.00, liquidity: 1500000, roe: 5.0, net_margin: 60.0, cagr_revenue: 2.0, variation_percent: -0.50 },
    
    // Ações
    'PETR4': { name: 'Petrobras', type: 'ACAO', p_l: 3.5, p_vp: 0.9, dy_12m: 18.5, price: 38.50, liquidity: 1500000000, roe: 28.5, net_margin: 25.0, cagr_revenue: 15.0, variation_percent: 1.20 },
    'VALE3': { name: 'Vale', type: 'ACAO', p_l: 5.2, p_vp: 1.4, dy_12m: 8.2, price: 62.10, liquidity: 1200000000, roe: 22.0, net_margin: 20.0, cagr_revenue: 8.0, variation_percent: -0.50 },
    'ITUB4': { name: 'Itaú Unibanco', type: 'ACAO', p_l: 8.5, p_vp: 1.6, dy_12m: 5.5, price: 34.20, liquidity: 800000000, roe: 18.5, net_margin: 18.0, cagr_revenue: 10.0, variation_percent: 0.80 },
    'BBDC4': { name: 'Bradesco', type: 'ACAO', p_l: 9.2, p_vp: 0.95, dy_12m: 6.8, price: 13.50, liquidity: 600000000, roe: 12.0, net_margin: 14.0, cagr_revenue: 5.0, variation_percent: 0.30 },
    'BBAS3': { name: 'Banco do Brasil', type: 'ACAO', p_l: 4.5, p_vp: 0.85, dy_12m: 9.5, price: 27.80, liquidity: 500000000, roe: 20.0, net_margin: 22.0, cagr_revenue: 12.0, variation_percent: 0.60 },
    'WEGE3': { name: 'WEG', type: 'ACAO', p_l: 28.0, p_vp: 5.5, dy_12m: 1.8, price: 40.50, liquidity: 400000000, roe: 25.0, net_margin: 16.0, cagr_revenue: 18.0, variation_percent: 1.50 },
    'PRIO3': { name: 'PetroRio', type: 'ACAO', p_l: 7.8, p_vp: 2.2, dy_12m: 0.0, price: 45.00, liquidity: 350000000, roe: 30.0, net_margin: 40.0, cagr_revenue: 25.0, variation_percent: 2.00 },
    'ELET3': { name: 'Eletrobras', type: 'ACAO', p_l: 15.0, p_vp: 0.7, dy_12m: 2.5, price: 38.00, liquidity: 300000000, roe: 5.0, net_margin: 10.0, cagr_revenue: 4.0, variation_percent: -0.40 },
    'ABEV3': { name: 'Ambev', type: 'ACAO', p_l: 13.5, p_vp: 2.5, dy_12m: 5.8, price: 12.50, liquidity: 250000000, roe: 18.0, net_margin: 22.0, cagr_revenue: 8.0, variation_percent: 0.10 },
    'RENT3': { name: 'Localiza', type: 'ACAO', p_l: 18.0, p_vp: 2.8, dy_12m: 2.2, price: 48.00, liquidity: 200000000, roe: 15.0, net_margin: 12.0, cagr_revenue: 20.0, variation_percent: 0.90 },
    'BPAC11': { name: 'BTG Pactual', type: 'ACAO', p_l: 10.5, p_vp: 2.0, dy_12m: 3.5, price: 32.00, liquidity: 180000000, roe: 20.0, net_margin: 25.0, cagr_revenue: 15.0, variation_percent: 1.10 },
    'SUZB3': { name: 'Suzano', type: 'ACAO', p_l: 6.5, p_vp: 1.5, dy_12m: 4.5, price: 55.00, liquidity: 150000000, roe: 22.0, net_margin: 28.0, cagr_revenue: 10.0, variation_percent: -0.20 },
    'GGBR4': { name: 'Gerdau', type: 'ACAO', p_l: 5.8, p_vp: 0.9, dy_12m: 6.0, price: 18.50, liquidity: 120000000, roe: 15.0, net_margin: 14.0, cagr_revenue: 8.0, variation_percent: 0.40 },
    'CSAN3': { name: 'Cosan', type: 'ACAO', p_l: 12.0, p_vp: 1.8, dy_12m: 3.0, price: 14.50, liquidity: 100000000, roe: 14.0, net_margin: 8.0, cagr_revenue: 12.0, variation_percent: -0.60 },
    'JBSS3': { name: 'JBS', type: 'ACAO', p_l: 4.8, p_vp: 1.2, dy_12m: 7.5, price: 28.00, liquidity: 90000000, roe: 25.0, net_margin: 5.0, cagr_revenue: 10.0, variation_percent: 0.70 },
    'RAIL3': { name: 'Rumo', type: 'ACAO', p_l: 20.0, p_vp: 2.5, dy_12m: 1.5, price: 22.00, liquidity: 80000000, roe: 12.0, net_margin: 15.0, cagr_revenue: 9.0, variation_percent: 0.30 },
    'VIVT3': { name: 'Vivo', type: 'ACAO', p_l: 11.0, p_vp: 1.1, dy_12m: 6.5, price: 48.50, liquidity: 70000000, roe: 10.0, net_margin: 12.0, cagr_revenue: 4.0, variation_percent: 0.15 },
    'TIMS3': { name: 'TIM', type: 'ACAO', p_l: 12.5, p_vp: 1.6, dy_12m: 5.8, price: 17.50, liquidity: 60000000, roe: 13.0, net_margin: 14.0, cagr_revenue: 5.0, variation_percent: 0.20 },
    'SBSP3': { name: 'Sabesp', type: 'ACAO', p_l: 14.0, p_vp: 1.3, dy_12m: 2.0, price: 78.00, liquidity: 110000000, roe: 9.5, net_margin: 18.0, cagr_revenue: 7.0, variation_percent: -0.10 },
    'CMIG4': { name: 'Cemig', type: 'ACAO', p_l: 5.5, p_vp: 1.1, dy_12m: 8.5, price: 11.50, liquidity: 90000000, roe: 20.0, net_margin: 16.0, cagr_revenue: 6.0, variation_percent: 0.50 },
    'CPLE6': { name: 'Copel', type: 'ACAO', p_l: 6.0, p_vp: 1.0, dy_12m: 7.0, price: 9.80, liquidity: 70000000, roe: 16.0, net_margin: 15.0, cagr_revenue: 6.5, variation_percent: 0.40 },
    'TAEE11': { name: 'Taesa', type: 'ACAO', p_l: 9.5, p_vp: 1.8, dy_12m: 9.8, price: 35.50, liquidity: 60000000, roe: 19.0, net_margin: 45.0, cagr_revenue: 8.0, variation_percent: 0.25 },
    'BBSE3': { name: 'BB Seguridade', type: 'ACAO', p_l: 8.8, p_vp: 5.5, dy_12m: 9.2, price: 32.50, liquidity: 80000000, roe: 60.0, net_margin: 55.0, cagr_revenue: 10.0, variation_percent: 0.35 },
    'CXSE3': { name: 'Caixa Seguridade', type: 'ACAO', p_l: 9.0, p_vp: 3.5, dy_12m: 8.5, price: 14.50, liquidity: 50000000, roe: 40.0, net_margin: 48.0, cagr_revenue: 12.0, variation_percent: 0.20 },
    'KLBN11': { name: 'Klabin', type: 'ACAO', p_l: 7.5, p_vp: 1.8, dy_12m: 5.5, price: 21.50, liquidity: 75000000, roe: 24.0, net_margin: 20.0, cagr_revenue: 9.0, variation_percent: -0.30 }
};

const processStaticMarketData = (): MarketOverview => {
    // Processa os dados estáticos simulando a API
    const fiis = Object.entries(STATIC_MARKET_DATA).filter(([_, v]) => v.type === 'FII').map(([k, v]) => ({ ticker: k, ...v }));
    const stocks = Object.entries(STATIC_MARKET_DATA).filter(([_, v]) => v.type === 'ACAO').map(([k, v]) => ({ ticker: k, ...v }));

    const processList = (list: any[]) => ({
        gainers: [...list].sort((a, b) => (b.variation_percent || 0) - (a.variation_percent || 0)).slice(0, 10),
        losers: [...list].sort((a, b) => (a.variation_percent || 0) - (b.variation_percent || 0)).slice(0, 10),
        high_yield: [...list].sort((a, b) => (b.dy_12m || 0) - (a.dy_12m || 0)).slice(0, 20),
        discounted: [...list].filter(a => a.type === 'FII' ? a.p_vp < 1 : a.p_l < 10).sort((a, b) => (a.type === 'FII' ? a.p_vp - b.p_vp : a.p_l - b.p_l)).slice(0, 20),
        raw: list
    });

    return {
        market_status: new Date().getHours() >= 10 && new Date().getHours() < 17 && new Date().getDay() > 0 && new Date().getDay() < 6 ? 'Mercado Aberto' : 'Mercado Fechado',
        last_update: new Date().toISOString(),
        highlights: {
            fiis: processList(fiis) as any,
            stocks: processList(stocks) as any
        },
        error: true // Marca como fallback para a UI saber
    };
};

const fetchInflationData = async (): Promise<number> => {
    let lastKnownReal = 0;
    try {
        const s = localStorage.getItem('investfiis_v4_indicators');
        if (s) {
            const p = JSON.parse(s);
            if (p.ipca && typeof p.ipca === 'number' && p.ipca > 0) {
                lastKnownReal = p.ipca;
            }
        }
    } catch {}

    if (lastKnownReal === 0) lastKnownReal = 4.50; 

    try {
        const response = await fetch('/api/indicators', { 
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(8000) 
        });
        
        if (!response.ok) return lastKnownReal;
        
        const data = await response.json();
        
        if (data && typeof data.value === 'number' && !data.isError && data.value > 0) {
            return data.value;
        }
        
        return lastKnownReal;
    } catch (e) {
        return lastKnownReal;
    }
};

const parseNumberSafe = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const str = String(val).trim().replace('R$', '').replace('%', '').trim();
    const cleanStr = str.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(cleanStr);
    return isNaN(num) ? 0 : num;
};

const normalizeTickerRoot = (t: string) => {
    let clean = t.trim().toUpperCase();
    if (clean.endsWith('F') && !clean.endsWith('11') && !clean.endsWith('11B') && clean.length <= 6) {
        return clean.slice(0, -1);
    }
    return clean;
};

/**
 * Converte dados brutos do Scraper/Banco (chaves do DB) para a interface do Frontend (AssetFundamentals)
 * Centraliza a lógica de mapeamento para garantir consistência.
 */
export const mapScraperToFundamentals = (m: any): AssetFundamentals => {
    const getVal = (...keys: string[]) => {
        for (const k of keys) {
            if (m[k] !== undefined && m[k] !== null && m[k] !== 'N/A' && m[k] !== '') return m[k];
        }
        return undefined;
    };

    return {
        // Comuns
        p_vp: parseNumberSafe(getVal('pvp', 'p_vp', 'vp')),
        dy_12m: parseNumberSafe(getVal('dy_12m', 'dy', 'dividend_yield')), 
        p_l: parseNumberSafe(getVal('pl', 'p_l')),
        roe: parseNumberSafe(getVal('roe')),
        liquidity: getVal('liquidez', 'liquidez_media_diaria') || '', 
        market_cap: getVal('valor_mercado', 'val_mercado', 'market_cap') || undefined, 
        
        // Ações
        net_margin: parseNumberSafe(getVal('margem_liquida', 'net_margin')),
        gross_margin: parseNumberSafe(getVal('margem_bruta', 'gross_margin')),
        cagr_revenue: parseNumberSafe(getVal('cagr_receita', 'cagr_receita_5a')),
        cagr_profits: parseNumberSafe(getVal('cagr_lucro', 'cagr_lucros_5a')),
        net_debt_ebitda: parseNumberSafe(getVal('divida_liquida_ebitda', 'net_debt_ebitda')),
        ev_ebitda: parseNumberSafe(getVal('ev_ebitda')),
        lpa: parseNumberSafe(getVal('lpa')),
        vpa: parseNumberSafe(getVal('vpa', 'vp_cota', 'vp')),

        // FIIs
        vacancy: parseNumberSafe(getVal('vacancia', 'vacancia_fisica', 'vacancy')),
        manager_type: getVal('tipo_gestao', 'manager_type') || undefined,
        // Garante leitura de patrimônio líquido (String do Scraper ou do DB)
        assets_value: getVal('patrimonio_liquido', 'patrimonio', 'assets_value') || undefined, 
        management_fee: getVal('taxa_adm', 'management_fee') || undefined,
        last_dividend: parseNumberSafe(getVal('ultimo_rendimento', 'last_dividend', 'rendimento')),
        properties_count: parseNumberSafe(getVal('num_cotistas', 'cotistas')),
        
        updated_at: m.updated_at,
        
        sentiment: 'Neutro',
        sources: []
    };
};

// Função para acionar o Scraper no Backend (Serverless)
export const triggerScraperUpdate = async (tickers: string[], onProgress?: (current: number, total: number) => void): Promise<ScrapeResult[]> => {
    const uniqueTickers = Array.from(new Set(tickers.map(normalizeTickerRoot)));
    let processed = 0;
    const results: ScrapeResult[] = [];
    const BATCH_SIZE = 3;
    
    for (let i = 0; i < uniqueTickers.length; i += BATCH_SIZE) {
        const batch = uniqueTickers.slice(i, i + BATCH_SIZE);
        
        await Promise.all(batch.map(async (ticker) => {
            try {
                const res = await fetch(`/api/update-stock?ticker=${ticker}`);
                const data = await res.json();

                if (data.success && data.data) {
                    const meta = data.data;
                    results.push({
                        ticker,
                        status: 'success',
                        details: {
                            price: parseNumberSafe(meta.cotacao_atual || meta.current_price),
                            dy: parseNumberSafe(meta.dy || meta.dy_12m),
                            pvp: parseNumberSafe(meta.pvp),
                            pl: parseNumberSafe(meta.pl)
                        },
                        rawFundamentals: meta,
                        dividendsFound: data.dividends 
                    });
                } else {
                    throw new Error(data.error || 'Falha na resposta da API');
                }
            } catch (e: any) {
                console.warn(`Falha ao atualizar ${ticker}`, e);
                results.push({
                    ticker,
                    status: 'error',
                    message: e.message || 'Erro de conexão'
                });
            } finally {
                processed++;
                if (onProgress) onProgress(processed, uniqueTickers.length);
            }
        }));

        if (i + BATCH_SIZE < uniqueTickers.length) {
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    
    return results;
};

export const fetchUnifiedMarketData = async (tickers: string[], startDate?: string, forceRefresh = false): Promise<UnifiedMarketData> => {
  if (!tickers || tickers.length === 0) return { dividends: [], metadata: {} };

  const uniqueTickers = Array.from(new Set(tickers.map(normalizeTickerRoot)));

  try {
      const { data: dividendsData, error: divError } = await supabase
            .from('market_dividends')
            .select('*')
            .in('ticker', uniqueTickers);

      if (divError && divError.code !== 'PGRST205') console.error("Erro Supabase (Dividendos):", divError);

      const dividends: DividendReceipt[] = (dividendsData || []).map((d: any) => ({
            id: d.id,
            ticker: d.ticker,
            type: d.type,
            dateCom: d.date_com, 
            paymentDate: d.payment_date,
            rate: Number(d.rate),
            quantityOwned: 0, 
            totalReceived: 0
      }));

      const { data: metaData, error: metaError } = await supabase
            .from('ativos_metadata')
            .select('*')
            .in('ticker', uniqueTickers);

      if (metaError && metaError.code !== 'PGRST205') console.error("Erro Supabase (Metadata):", metaError);

      const metadata: Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }> = {};
      
      if (metaData) {
          metaData.forEach((m: any) => {
              let assetType = AssetType.STOCK;
              if (m.type === 'FII' || m.ticker.endsWith('11') || m.ticker.endsWith('11B')) {
                  assetType = AssetType.FII;
              }

              const normalizedTicker = m.ticker.trim().toUpperCase();

              metadata[normalizedTicker] = {
                  segment: m.segment || 'Geral',
                  type: assetType,
                  fundamentals: mapScraperToFundamentals(m)
              };
          });
      }

      const ipca = await fetchInflationData();

      return { 
          dividends, 
          metadata, 
          indicators: { ipca_cumulative: ipca, start_date_used: startDate || '' }
      };

  } catch (error: any) {
      console.error("DataService Fatal:", error);
      return { dividends: [], metadata: {}, error: error.message };
  }
};

export const fetchMarketOverview = async (): Promise<MarketOverview> => {
    try {
        const response = await fetch('/api/market-overview');
        let data;
        
        if (response.ok) {
            try {
                data = await response.json();
            } catch {
                // Ignore parsing errors, will fallback
            }
        }

        // Se a API retornou sucesso e dados válidos, usa eles
        if (data && !data.error && data.highlights) {
            return data;
        }
        
        // Se chegou aqui, algo falhou na API
        throw new Error('Falha ou dados inválidos da API');
        
    } catch (error: any) {
        console.warn("Market API Offline/Error, using static fallback engine.");
        // FALLBACK: Retorna dados estáticos processados localmente
        return processStaticMarketData();
    }
};
