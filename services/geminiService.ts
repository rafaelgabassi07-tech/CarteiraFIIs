
import { DividendReceipt, AssetType, AssetFundamentals, MarketIndicators } from "../types";
import { supabase } from "./supabase";

export interface UnifiedMarketData {
  dividends: DividendReceipt[];
  metadata: Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }>;
  indicators?: MarketIndicators;
  error?: string;
}

// Busca IPCA acumulado 12 meses
const fetchInflationData = async (): Promise<number> => {
    const FALLBACK_IPCA = 4.62;
    try {
        // Tenta a API interna
        const response = await fetch('/api/indicators', { 
            headers: { 'Accept': 'application/json' },
            // Timeout curto para não travar a UI se a API local não existir
            signal: AbortSignal.timeout(3000) 
        });
        
        if (!response.ok) {
            // Em dev local sem Vercel, isso vai dar 404. É esperado.
            // console.warn("API de indicadores indisponível, usando fallback.");
            return FALLBACK_IPCA;
        }
        
        const data = await response.json();
        if (data && typeof data.value === 'number') {
            return data.value;
        }
        
        return FALLBACK_IPCA;
    } catch (e) {
        // Erro de rede, timeout ou json inválido
        return FALLBACK_IPCA;
    }
};

export const fetchUnifiedMarketData = async (tickers: string[], startDate?: string, forceRefresh = false): Promise<UnifiedMarketData> => {
  if (!tickers || tickers.length === 0) return { dividends: [], metadata: {} };

  const uniqueTickers = Array.from(new Set(tickers.map(t => t.trim().toUpperCase())));

  try {
      // 1. Busca Dividendos Históricos e Futuros no Supabase (Fonte: Scraper)
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
            quantityOwned: 0, // Será calculado no App.tsx
            totalReceived: 0 // Será calculado no App.tsx
      }));

      // 2. Busca Metadata (Fundamentos e Segmentos) no Supabase (Fonte: Scraper)
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
                      p_vp: Number(m.pvp) || 0,
                      dy_12m: Number(m.dy_12m) || 0,
                      p_l: Number(m.pl) || 0,
                      roe: Number(m.roe) || 0,
                      vacancy: Number(m.vacancia) || 0,
                      liquidity: m.liquidez || '',
                      market_cap: m.current_price ? String(m.current_price) : undefined, 
                      sentiment: 'Neutro',
                      sentiment_reason: `Dados fundamentais atualizados em ${new Date(m.updated_at).toLocaleDateString()}`,
                      sources: [{ title: 'Investidor10', uri: `https://investidor10.com.br/` }]
                  }
              };
          });
      }

      // 3. Busca Indicadores Macro (Async)
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
