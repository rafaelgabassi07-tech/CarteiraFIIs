
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
                      p_vp: m.pvp ? Number(m.pvp) : 0,
                      dy_12m: m.dy_12m ? Number(m.dy_12m) : 0,
                      p_l: m.pl ? Number(m.pl) : 0,
                      roe: m.roe ? Number(m.roe) : 0,
                      liquidity: m.liquidez || '',
                      market_cap: m.valor_mercado || undefined, 
                      
                      // Ações - Extraídos se existirem nas colunas ou JSON
                      net_margin: m.margem_liquida ? Number(m.margem_liquida) : undefined,
                      cagr_revenue: m.cagr_receita ? Number(m.cagr_receita) : undefined,
                      cagr_profits: m.cagr_lucro ? Number(m.cagr_lucro) : undefined,
                      net_debt_ebitda: m.divida_liquida_ebitda ? Number(m.divida_liquida_ebitda) : undefined,
                      lpa: m.lpa ? Number(m.lpa) : undefined,
                      vpa: m.vpa ? Number(m.vpa) : undefined,

                      // FIIs
                      vacancy: m.vacancia ? Number(m.vacancia) : 0,
                      manager_type: m.tipo_gestao || undefined,
                      assets_value: m.patrimonio_liquido || undefined,
                      management_fee: m.taxa_adm || undefined,

                      sentiment: 'Neutro',
                      sentiment_reason: `Dados atualizados em ${m.updated_at ? new Date(m.updated_at).toLocaleDateString('pt-BR') : 'Recentemente'}.`,
                      sources: [{ title: 'Investidor10', uri: `https://investidor10.com.br/${assetType === AssetType.FII ? 'fiis' : 'acoes'}/${normalizedTicker.toLowerCase()}/` }]
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
