
import { DividendReceipt, AssetType, AssetFundamentals, MarketIndicators } from "../types";
import { supabase } from "./supabase";

export interface UnifiedMarketData {
  dividends: DividendReceipt[];
  metadata: Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }>;
  indicators?: MarketIndicators;
  error?: string;
}

export const fetchUnifiedMarketData = async (tickers: string[], startDate?: string, forceRefresh = false): Promise<UnifiedMarketData> => {
  if (!tickers || tickers.length === 0) return { dividends: [], metadata: {} };

  const uniqueTickers = Array.from(new Set(tickers.map(t => t.trim().toUpperCase())));

  try {
      // 1. Busca Dividendos
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

      // 2. Busca Metadata (Fundamentos)
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

              metadata[m.ticker] = {
                  segment: m.segment || 'Geral',
                  type: assetType,
                  fundamentals: {
                      // IMPORTANTE: Mapeamento direto das colunas do banco
                      p_vp: Number(m.pvp) || 0,
                      dy_12m: Number(m.dy_12m) || 0,
                      // O scraper agora salva current_price, podemos usar se a Brapi falhar
                      market_cap: m.current_price ? String(m.current_price) : undefined, 
                      sentiment: 'Neutro',
                      sentiment_reason: `Dados atualizados em ${new Date(m.updated_at).toLocaleDateString()}`,
                      sources: [{ title: 'Investidor10', uri: `https://investidor10.com.br/` }]
                  }
              };
          });
      }

      return { 
          dividends, 
          metadata, 
          indicators: { ipca_cumulative: 0, start_date_used: startDate || '' }
      };

  } catch (error: any) {
      console.error("MarketService Fatal:", error);
      return { dividends: [], metadata: {}, error: error.message };
  }
};
