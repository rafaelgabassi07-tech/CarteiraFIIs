
import { DividendReceipt, AssetType, AssetFundamentals, MarketIndicators } from "../types";
import { supabase } from "./supabase";

export interface UnifiedMarketData {
  dividends: DividendReceipt[];
  metadata: Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }>;
  indicators?: MarketIndicators;
  error?: string;
}

/**
 * Serviço de Dados de Mercado (Ex-GeminiService)
 * 
 * Agora atua apenas como leitor do banco de dados local (Supabase),
 * servindo os dados que foram coletados via Scraper (Crawler).
 * A funcionalidade de IA foi removida conforme solicitado.
 */
export const fetchUnifiedMarketData = async (tickers: string[], startDate?: string, forceRefresh = false): Promise<UnifiedMarketData> => {
  if (!tickers || tickers.length === 0) return { dividends: [], metadata: {} };

  const uniqueTickers = Array.from(new Set(tickers.map(t => t.toUpperCase())));

  try {
      console.log(`[MarketService] Buscando dados no banco local para ${uniqueTickers.length} ativos...`);

      // 1. Busca Dividendos do Banco de Dados (tabela market_dividends)
      const { data: dividendsData, error: divError } = await supabase
            .from('market_dividends')
            .select('*')
            .in('ticker', uniqueTickers);

      if (divError) throw divError;

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

      // 2. Busca Metadados do Banco de Dados (tabela ativos_metadata)
      const { data: metaData, error: metaError } = await supabase
            .from('ativos_metadata')
            .select('*')
            .in('ticker', uniqueTickers);

      if (metaError) throw metaError;

      const metadata: Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }> = {};
      
      if (metaData) {
          metaData.forEach((m: any) => {
              // Determina o tipo de ativo baseado no registro do banco ou inferência pelo ticker
              let assetType = AssetType.STOCK;
              // Verifica se no banco está salvo como 'FII' ou se termina com 11/11B
              if (m.type === 'FII' || m.ticker.endsWith('11') || m.ticker.endsWith('11B')) {
                  assetType = AssetType.FII;
              }

              metadata[m.ticker] = {
                  segment: m.segment || 'Geral',
                  type: assetType,
                  fundamentals: {
                      p_vp: m.pvp,
                      dy_12m: m.dy_12m,
                      // Preenche campos de "IA" com valores estáticos para manter compatibilidade de UI
                      sentiment: 'Neutro',
                      sentiment_reason: 'Dados obtidos via Scraper.',
                      sources: [{ title: 'Investidor10', uri: `https://investidor10.com.br/` }]
                  }
              };
          });
      }

      return { 
          dividends, 
          metadata, 
          indicators: { 
              // Como removemos a IA, não temos o IPCA em tempo real aqui. Retornamos 0.
              ipca_cumulative: 0, 
              start_date_used: startDate || '' 
          }
      };

  } catch (error: any) {
      console.error("MarketService Error:", error);
      return { dividends: [], metadata: {}, error: error.message || 'Erro ao buscar dados locais' };
  }
};
