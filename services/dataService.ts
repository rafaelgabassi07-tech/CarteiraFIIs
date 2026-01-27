
import { DividendReceipt, AssetType, AssetFundamentals, MarketIndicators, ScrapeResult } from "../types";
import { supabase } from "./supabase";
import { getQuotes } from "./brapiService";
import { normalizeTicker } from "./portfolioRules";

export interface UnifiedMarketData {
  dividends: DividendReceipt[];
  metadata: Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }>;
  indicators?: MarketIndicators;
  error?: string;
}

const getTTL = () => {
    // Cache mais agressivo para evitar chamadas desnecessárias
    return 60 * 60 * 1000; // 1 Hora
};

const isStale = (dateString?: string) => {
    if (!dateString) return true;
    const lastUpdate = new Date(dateString).getTime();
    const now = Date.now();
    return (now - lastUpdate) > getTTL();
};

const parseNumberSafe = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    
    let str = String(val).replace(/[^\d.,-]/g, '').trim();
    if (!str || str === '-') return 0;

    // Detecta formato BR (ex: 1.000,50) vs US (1000.50)
    const hasComma = str.includes(',');
    const hasDot = str.includes('.');

    if (hasComma && hasDot) {
        if (str.lastIndexOf(',') > str.lastIndexOf('.')) { // 1.000,50
             str = str.replace(/\./g, '').replace(',', '.');
        } else { // 1,000.50
             str = str.replace(/,/g, '');
        }
    } else if (hasComma) {
        str = str.replace(',', '.');
    }

    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
};

export const mapScraperToFundamentals = (m: any): AssetFundamentals => {
    const getVal = (...keys: string[]): any => {
        for (const k of keys) {
            // Aceita 0 como valor válido, mas rejeita null/undefined/string vazia
            if (m[k] !== undefined && m[k] !== null && m[k] !== '' && m[k] !== 'N/A') return m[k];
        }
        return undefined;
    };

    return {
        // Indicadores Gerais
        p_vp: parseNumberSafe(getVal('pvp', 'p_vp')),
        dy_12m: parseNumberSafe(getVal('dy_12m', 'dy')), 
        p_l: parseNumberSafe(getVal('pl', 'p_l')),
        roe: parseNumberSafe(getVal('roe')),
        
        liquidity: getVal('liquidez', 'liquidez_media_diaria') || '', 
        market_cap: getVal('val_mercado', 'valor_mercado') || undefined, 
        assets_value: getVal('patrimonio_liquido') || undefined, 
        
        manager_type: getVal('tipo_gestao') || undefined,
        management_fee: getVal('taxa_adm') || undefined,
        
        // Ações (Stocks)
        net_margin: parseNumberSafe(getVal('margem_liquida')),
        gross_margin: parseNumberSafe(getVal('margem_bruta')),
        cagr_revenue: parseNumberSafe(getVal('cagr_receita_5a')),
        cagr_profits: parseNumberSafe(getVal('cagr_lucros_5a')),
        net_debt_ebitda: parseNumberSafe(getVal('divida_liquida_ebitda')),
        ev_ebitda: parseNumberSafe(getVal('ev_ebitda')),
        lpa: parseNumberSafe(getVal('lpa')),
        vpa: parseNumberSafe(getVal('vp_cota', 'vpa')),
        
        // FIIs
        vacancy: parseNumberSafe(getVal('vacancia')),
        last_dividend: parseNumberSafe(getVal('ultimo_rendimento')),
        properties_count: parseNumberSafe(getVal('num_cotistas')),
        
        updated_at: m.updated_at,
        sentiment: 'Neutro',
        sources: []
    };
};

const fetchInflationData = async (): Promise<number> => {
    let lastKnownReal = 0;
    try {
        const s = localStorage.getItem('investfiis_v4_indicators');
        if (s) {
            const p = JSON.parse(s);
            if (p.ipca && typeof p.ipca === 'number' && p.ipca > 0) lastKnownReal = p.ipca;
        }
    } catch {}
    if (lastKnownReal === 0) lastKnownReal = 4.50; 

    try {
        const response = await fetch('/api/indicators', { 
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(5000) 
        });
        if (!response.ok) return lastKnownReal;
        const data = await response.json();
        if (data && typeof data.value === 'number' && !data.isError && data.value > 0) return data.value;
        return lastKnownReal;
    } catch (e) {
        return lastKnownReal;
    }
};

export const triggerScraperUpdate = async (tickers: string[], force = false): Promise<ScrapeResult[]> => {
    const uniqueTickers = Array.from(new Set(tickers.map(normalizeTicker)));
    const results: ScrapeResult[] = [];
    
    // Batch processing to prevent timeouts
    const BATCH_SIZE = 3;
    for (let i = 0; i < uniqueTickers.length; i += BATCH_SIZE) {
        const batch = uniqueTickers.slice(i, i + BATCH_SIZE);
        
        await Promise.all(batch.map(async (ticker) => {
            try {
                // Chama API local com force=true
                const res = await fetch(`/api/update-stock?ticker=${ticker}&force=${force}`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                
                const data = await res.json();

                if (data.success && data.data) {
                    results.push({
                        ticker,
                        status: 'success',
                        details: {
                            price: parseNumberSafe(data.data.current_price || data.data.cotacao_atual),
                            dy: parseNumberSafe(data.data.dy_12m || data.data.dy)
                        },
                        rawFundamentals: data.data,
                        dividendsFound: data.dividends 
                    });
                } else {
                    throw new Error(data.error || 'Erro desconhecido');
                }
            } catch (e: any) {
                console.warn(`Update failed for ${ticker}`, e);
                results.push({ ticker, status: 'error', message: e.message });
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

  const uniqueTickers = Array.from(new Set(tickers.map(normalizeTicker)));

  try {
      const [divResponse, metaResponse] = await Promise.all([
          supabase.from('market_dividends').select('*').in('ticker', uniqueTickers),
          supabase.from('ativos_metadata').select('*').in('ticker', uniqueTickers)
      ]);

      const dividendsData = divResponse.data || [];
      const metaData = metaResponse.data || [];

      // Mapeamento dos dividendos
      const dividends: DividendReceipt[] = dividendsData.map((d: any) => ({
            id: d.id || `${d.ticker}-${d.date_com}-${d.rate}`,
            ticker: d.ticker,
            type: d.type,
            dateCom: d.date_com, 
            paymentDate: d.payment_date,
            rate: Number(d.rate),
            quantityOwned: 0, 
            totalReceived: 0
      }));

      // Mapeamento dos metadados com parsing
      const metadata: Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }> = {};
      
      metaData.forEach((m: any) => {
          let assetType = AssetType.STOCK;
          if (m.type === 'FII' || m.ticker.endsWith('11') || m.ticker.endsWith('11B')) {
              assetType = AssetType.FII;
          }

          const normalizedTicker = normalizeTicker(m.ticker);
          metadata[normalizedTicker] = {
              segment: m.segment || 'Geral',
              type: assetType,
              fundamentals: mapScraperToFundamentals(m)
          };
      });

      // Checa se algum ticker solicitado não tem dados ou dados velhos
      const missingOrStale = uniqueTickers.filter(t => {
          const m = metadata[t];
          return !m || (m.fundamentals?.updated_at && isStale(m.fundamentals.updated_at));
      });

      // Se forceRefresh for true, atualizamos todos. Se não, só os que faltam.
      const toUpdate = forceRefresh ? uniqueTickers : missingOrStale;

      if (toUpdate.length > 0) {
          // Dispara update em background (não bloqueia UI)
          triggerScraperUpdate(toUpdate, true).then(results => {
              console.log(`[DataService] Background update finished for ${results.length} assets`);
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
