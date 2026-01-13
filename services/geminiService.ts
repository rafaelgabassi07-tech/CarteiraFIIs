
import { DividendReceipt, AssetType, AssetFundamentals, MarketIndicators } from "../types";
import { supabase } from "./supabase";

export interface UnifiedMarketData {
  dividends: DividendReceipt[];
  metadata: Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }>;
  indicators?: MarketIndicators;
  error?: string;
}

// Busca IPCA acumulado 12 meses via BrasilAPI (Dados Oficiais)
const fetchInflationData = async (): Promise<number> => {
    try {
        // Busca taxa SELIC e IPCA (Taxas V1 da BrasilAPI)
        // Se a BrasilAPI falhar, usamos um fallback aproximado do IPCA atual (4.5%)
        const response = await fetch('https://brasilapi.com.br/api/taxas/v1', { cache: 'force-cache' });
        if (!response.ok) return 4.5;
        
        const data = await response.json();
        // A API retorna um array, ex: [{ nome: 'Selic', valor: 10.75 }, { nome: 'CDI', valor: 10.65 }, { nome: 'IPCA', valor: 4.50 }]
        // O valor do IPCA na BrasilAPI geralmente é o acumulado 12 meses ou a meta.
        const ipcaObj = data.find((item: any) => item.nome === 'IPCA');
        
        return ipcaObj ? Number(ipcaObj.valor) : 4.5;
    } catch (e) {
        console.warn("Erro ao buscar inflação, usando fallback", e);
        return 4.5;
    }
};

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

      // 2. Busca Metadata (Fundamentos e Segmentos)
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
                      p_vp: Number(m.pvp) || 0,
                      dy_12m: Number(m.dy_12m) || 0,
                      market_cap: m.current_price ? String(m.current_price) : undefined, 
                      sentiment: 'Neutro',
                      sentiment_reason: `Dados atualizados em ${new Date(m.updated_at).toLocaleDateString()}`,
                      sources: [{ title: 'Investidor10', uri: `https://investidor10.com.br/` }]
                  }
              };
          });
      }

      // 3. Busca Indicadores Macro (Inflação)
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
