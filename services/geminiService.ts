
import { DividendReceipt, AssetType, AssetFundamentals, MarketIndicators } from "../types";
import { supabase } from "./supabase";

export interface UnifiedMarketData {
  dividends: DividendReceipt[];
  metadata: Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }>;
  indicators?: MarketIndicators;
  error?: string;
}

const fetchInflationData = async (): Promise<number> => {
    const FALLBACK_IPCA = 4.62;
    try {
        const response = await fetch('/api/indicators', { 
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(10000) 
        });
        if (!response.ok) return FALLBACK_IPCA;
        const data = await response.json();
        return (data && typeof data.value === 'number') ? data.value : FALLBACK_IPCA;
    } catch (e) {
        return FALLBACK_IPCA;
    }
};

export const updateBatchWithAI = async (tickers: string[]): Promise<boolean> => {
    if (!tickers || tickers.length === 0) return false;
    try {
        const response = await fetch('/api/ai-feed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tickers })
        });
        const result = await response.json();
        return result.success;
    } catch (e) {
        console.error("Falha na atualização AI Batch:", e);
        return false;
    }
};

// Helper seguro para garantir que a UI receba números, mesmo se o banco devolver string
const parseNumberSafe = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const str = String(val).replace(',', '.');
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
};

export const fetchUnifiedMarketData = async (tickers: string[], startDate?: string, forceRefresh = false): Promise<UnifiedMarketData> => {
  if (!tickers || tickers.length === 0) return { dividends: [], metadata: {} };

  const uniqueTickers = Array.from(new Set(tickers.map(t => t.trim().toUpperCase())));

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
                  fundamentals: {
                      // Comuns
                      p_vp: parseNumberSafe(m.pvp),
                      dy_12m: parseNumberSafe(m.dy_12m),
                      p_l: parseNumberSafe(m.pl),
                      roe: parseNumberSafe(m.roe),
                      liquidity: m.liquidez || '',
                      market_cap: m.valor_mercado || undefined, 
                      
                      // Ações
                      net_margin: parseNumberSafe(m.margem_liquida),
                      gross_margin: parseNumberSafe(m.margem_bruta),
                      cagr_revenue: parseNumberSafe(m.cagr_receita),
                      cagr_profits: parseNumberSafe(m.cagr_lucro),
                      net_debt_ebitda: parseNumberSafe(m.divida_liquida_ebitda),
                      ev_ebitda: parseNumberSafe(m.ev_ebitda),
                      lpa: parseNumberSafe(m.lpa),
                      vpa: parseNumberSafe(m.vpa),

                      // FIIs
                      vacancy: parseNumberSafe(m.vacancia),
                      manager_type: m.tipo_gestao || undefined,
                      assets_value: m.patrimonio_liquido || undefined,
                      management_fee: m.taxa_adm || undefined,
                      last_dividend: parseNumberSafe(m.ultimo_rendimento),
                      
                      updated_at: m.updated_at,

                      sentiment: 'Neutro',
                      sentiment_reason: `Dados Gemini 2.5: ${m.updated_at ? new Date(m.updated_at).toLocaleDateString('pt-BR') : 'Recente'}.`,
                      sources: [{ title: 'Google Search Grounding', uri: `https://google.com/search?q=${normalizedTicker}+fundamentos` }]
                  }
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
      console.error("MarketService Fatal:", error);
      return { dividends: [], metadata: {}, error: error.message };
  }
};
