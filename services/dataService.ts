
import { DividendReceipt, AssetType, AssetFundamentals, MarketIndicators, MarketOverview, ScrapeResult } from "../types";
import { supabase } from "./supabase";

export interface UnifiedMarketData {
  dividends: DividendReceipt[];
  metadata: Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }>;
  indicators?: MarketIndicators;
  error?: string;
}

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
        assets_value: getVal('patrimonio_liquido', 'patrimonio', 'assets_value') || undefined, 
        management_fee: getVal('taxa_adm', 'management_fee') || undefined,
        last_dividend: parseNumberSafe(getVal('ultimo_rendimento', 'last_dividend', 'rendimento')),
        properties_count: parseNumberSafe(getVal('num_cotistas', 'cotistas', 'num_cotistas')),
        
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
    const BATCH_SIZE = 3; // Lote pequeno para evitar timeout em Serverless
    
    for (let i = 0; i < uniqueTickers.length; i += BATCH_SIZE) {
        const batch = uniqueTickers.slice(i, i + BATCH_SIZE);
        
        await Promise.all(batch.map(async (ticker) => {
            try {
                // Tenta chamar a API do scraper
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

        // Delay para gentileza com o servidor alvo
        if (i + BATCH_SIZE < uniqueTickers.length) {
            await new Promise(r => setTimeout(r, 1500));
        }
    }
    
    return results;
};

export const fetchUnifiedMarketData = async (tickers: string[], startDate?: string, forceRefresh = false): Promise<UnifiedMarketData> => {
  if (!tickers || tickers.length === 0) return { dividends: [], metadata: {} };

  const uniqueTickers = Array.from(new Set(tickers.map(normalizeTickerRoot)));

  try {
      // 1. Fetch Dividendos
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

      // 2. Fetch Metadados (Fundamentos)
      const { data: metaData, error: metaError } = await supabase
            .from('ativos_metadata')
            .select('*')
            .in('ticker', uniqueTickers);

      if (metaError && metaError.code !== 'PGRST205') console.error("Erro Supabase (Metadata):", metaError);

      const metadata: Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }> = {};
      
      if (metaData) {
          metaData.forEach((m: any) => {
              let assetType = AssetType.STOCK;
              // Detecção de tipo mais robusta
              if (m.type === 'FII' || m.ticker.endsWith('11') || m.ticker.endsWith('11B')) {
                  assetType = AssetType.FII;
              }

              const normalizedTicker = m.ticker.trim().toUpperCase();

              // Mapeia e sanitiza
              const fundamentals = mapScraperToFundamentals(m);

              metadata[normalizedTicker] = {
                  segment: m.segment || 'Geral',
                  type: assetType,
                  fundamentals
              };
          });
      }

      // 3. Fetch Indicadores (IPCA)
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

        if (!response.ok && !data) throw new Error('Falha ao obter dados de mercado');
        if (data.error) throw new Error(data.message || 'Erro desconhecido');
        
        return data;
    } catch (error: any) {
        console.warn("Market Overview Fetch Error:", error.message);
        // Fallback gracioso para UI não quebrar
        return { 
            market_status: 'Indisponível', 
            last_update: '', 
            highlights: {
                fiis: { gainers: [], losers: [], high_yield: [], discounted: [], raw: [] },
                stocks: { gainers: [], losers: [], high_yield: [], discounted: [], raw: [] }
            },
            // @ts-ignore
            error: true,
            // @ts-ignore
            message: "Não foi possível carregar os dados de mercado. Tentando cache..."
        };
    }
};
