
import { DividendReceipt, AssetType, AssetFundamentals, MarketIndicators, MarketOverview, ScrapeResult } from "../types";
import { supabase } from "./supabase";

export interface UnifiedMarketData {
  dividends: DividendReceipt[];
  metadata: Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }>;
  indicators?: MarketIndicators;
  error?: string;
}

const fetchInflationData = async (): Promise<number> => {
    // 1. Tenta recuperar o último valor REAL conhecido do cache local
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
    const str = String(val).replace(',', '.');
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
};

// Helper para normalizar tickers fracionários (ITSA4F -> ITSA4)
const normalizeTickerRoot = (t: string) => {
    let clean = t.trim().toUpperCase();
    // Remove "F" final apenas se não for FII (terminado em 11 ou 11B) e tiver tamanho típico de ação
    if (clean.endsWith('F') && !clean.endsWith('11') && !clean.endsWith('11B') && clean.length <= 6) {
        return clean.slice(0, -1);
    }
    return clean;
};

// Função para acionar o Scraper no Backend (Serverless)
export const triggerScraperUpdate = async (tickers: string[], onProgress?: (current: number, total: number) => void): Promise<ScrapeResult[]> => {
    // Normaliza para remover o F de fracionário, pois o scraper busca pelo ticker padrão
    const uniqueTickers = Array.from(new Set(tickers.map(normalizeTickerRoot)));
    let processed = 0;
    const results: ScrapeResult[] = [];

    // Processa em lotes pequenos para evitar timeout do navegador ou rate limit
    const BATCH_SIZE = 3;
    
    for (let i = 0; i < uniqueTickers.length; i += BATCH_SIZE) {
        const batch = uniqueTickers.slice(i, i + BATCH_SIZE);
        
        await Promise.all(batch.map(async (ticker) => {
            try {
                // Chama o endpoint que faz o scrape real (Investidor10/StatusInvest)
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
                        dividendsFound: data.dividends // Captura os dividendos retornados pela API
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

        // Pequeno delay entre lotes para gentileza com a API de destino
        if (i + BATCH_SIZE < uniqueTickers.length) {
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    
    return results;
};

export const fetchUnifiedMarketData = async (tickers: string[], startDate?: string, forceRefresh = false): Promise<UnifiedMarketData> => {
  if (!tickers || tickers.length === 0) return { dividends: [], metadata: {} };

  // Normaliza tickers para remover "F" fracionário e garantir match com banco de dados
  const uniqueTickers = Array.from(new Set(tickers.map(normalizeTickerRoot)));

  try {
      // 1. Busca Dividendos
      const { data: dividendsData, error: divError } = await supabase
            .from('market_dividends')
            .select('*')
            .in('ticker', uniqueTickers);

      if (divError && divError.code !== 'PGRST205') console.error("Erro Supabase (Dividendos):", divError);

      const dividends: DividendReceipt[] = (dividendsData || []).map((d: any) => ({
            id: d.id,
            ticker: d.ticker, // Ticker vindo do banco (geralmente sem F)
            type: d.type,
            dateCom: d.date_com, 
            paymentDate: d.payment_date,
            rate: Number(d.rate),
            quantityOwned: 0, 
            totalReceived: 0
      }));

      // 2. Busca Metadados
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
                      sources: []
                  }
              };
          });
      }

      // 3. Busca Inflação (IPCA 12 Meses Real)
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
        try {
            data = await response.json();
        } catch {
            throw new Error(`Erro de conexão (${response.status})`);
        }

        if (!response.ok && !data) {
             throw new Error('Falha ao obter dados de mercado');
        }
        
        // Se houver erro estruturado do backend
        if (data.error) {
            throw new Error(data.message || 'Erro desconhecido');
        }
        
        return data;
    } catch (error: any) {
        console.warn("Market Overview Fetch Error:", error.message);
        return { 
            market_status: 'Indisponível', 
            sentiment_summary: 'Dados Offline',
            last_update: '', 
            highlights: {
                discounted_fiis: [],
                discounted_stocks: [],
                top_gainers: [],
                top_losers: [],
                high_dividend_yield: []
            },
            // @ts-ignore
            error: true,
            message: "Não foi possível carregar os dados de mercado."
        };
    }
};
