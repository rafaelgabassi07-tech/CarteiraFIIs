
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
      console.log(`[MarketData] Buscando dados para: ${uniqueTickers.join(', ')}`);

      // 1. Busca Dividendos
      // Importante: Se isso retornar [], verifique as Policies RLS no Supabase!
      const { data: dividendsData, error: divError } = await supabase
            .from('market_dividends')
            .select('*')
            .in('ticker', uniqueTickers);

      if (divError) {
          // PGRST205 = Tabela não existe. Outros erros são reais.
          if (divError.code !== 'PGRST205') console.error("Erro Supabase (Dividendos):", divError);
      } else if (!dividendsData || dividendsData.length === 0) {
          console.warn(`[Atenção] Nenhum dividendo retornado do banco para os ativos solicitados. Verifique: 1) Se o Scraper rodou. 2) Se as Policies RLS (Enable Read Access) estão criadas.`);
      }

      const dividends: DividendReceipt[] = (dividendsData || []).map((d: any) => ({
            id: d.id,
            ticker: d.ticker,
            type: d.type,
            dateCom: d.date_com, 
            paymentDate: d.payment_date,
            rate: Number(d.rate),
            quantityOwned: 0, // Calculado no App.tsx
            totalReceived: 0
      }));

      // 2. Busca Metadata
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
                      p_vp: m.pvp,
                      dy_12m: m.dy_12m,
                      sentiment: 'Neutro',
                      sentiment_reason: 'Dados via Investidor10',
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
