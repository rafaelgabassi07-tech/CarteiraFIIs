
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
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const isMarketOpen = day >= 1 && day <= 5 && hour >= 10 && hour < 18;
    return isMarketOpen ? 20 * 60 * 1000 : 4 * 60 * 60 * 1000;
};

const isStale = (dateString?: string) => {
    if (!dateString) return true;
    const lastUpdate = new Date(dateString).getTime();
    const now = Date.now();
    return (now - lastUpdate) > getTTL();
};

// --- HELPERS DE PARSING ---

const parseNumberSafe = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    
    let str = String(val).replace(/[^\d.,-]/g, '').trim();
    if (!str || str === '-') return 0;

    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');

    if (lastComma > lastDot) {
        str = str.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > lastComma) {
        str = str.replace(/,/g, '');
    }

    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
};

export const mapScraperToFundamentals = (m: any): AssetFundamentals => {
    const getVal = (...keys: string[]): any => {
        for (const k of keys) {
            if (m[k] !== undefined && m[k] !== null && m[k] !== 'N/A' && m[k] !== '') return m[k];
        }
        return undefined;
    };

    return {
        p_vp: parseNumberSafe(getVal('pvp', 'p_vp', 'vp')),
        dy_12m: parseNumberSafe(getVal('dy_12m', 'dy', 'dividend_yield')), 
        p_l: parseNumberSafe(getVal('pl', 'p_l')),
        roe: parseNumberSafe(getVal('roe')),
        
        liquidity: getVal('liquidez', 'liquidez_media_diaria') || '', 
        market_cap: getVal('valor_mercado', 'val_mercado', 'market_cap') || undefined, 
        assets_value: getVal('patrimonio_liquido', 'patrimonio', 'assets_value') || undefined, 
        
        manager_type: getVal('tipo_gestao', 'manager_type', 'gestao') || undefined,
        management_fee: getVal('taxa_adm', 'management_fee', 'taxadeadministracao', 'taxaadm') || undefined,
        
        // Indicadores Fundamentalistas Ações
        net_margin: parseNumberSafe(getVal('margem_liquida', 'net_margin', 'margemliquida')),
        gross_margin: parseNumberSafe(getVal('margem_bruta', 'gross_margin', 'margembruta')),
        cagr_revenue: parseNumberSafe(getVal('cagr_receita', 'cagr_receita_5a', 'cagrreceitas5anos')),
        cagr_profits: parseNumberSafe(getVal('cagr_lucro', 'cagr_lucros_5a', 'cagrlucros5anos')),
        net_debt_ebitda: parseNumberSafe(getVal('divida_liquida_ebitda', 'net_debt_ebitda', 'dividaliquidaebitda')),
        ev_ebitda: parseNumberSafe(getVal('ev_ebitda', 'evebitda')),
        lpa: parseNumberSafe(getVal('lpa')),
        vpa: parseNumberSafe(getVal('vpa', 'vp_cota', 'vp')),
        
        vacancy: parseNumberSafe(getVal('vacancia', 'vacancia_fisica', 'vacancy')),
        last_dividend: parseNumberSafe(getVal('ultimo_rendimento', 'last_dividend', 'rendimento', 'ultimorendimento')),
        properties_count: parseNumberSafe(getVal('num_cotistas', 'cotistas', 'num_cotistas')),
        
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
    
    const tickersToUpdate: string[] = [];

    if (force) {
        tickersToUpdate.push(...uniqueTickers);
    } else {
        const { data: existingData } = await supabase
            .from('ativos_metadata')
            .select('ticker, updated_at')
            .in('ticker', uniqueTickers);
            
        const dbMap = new Map<string, string>((existingData || []).map((d: any) => [d.ticker, d.updated_at]));

        uniqueTickers.forEach(t => {
            const lastUpdate = dbMap.get(t);
            if (!lastUpdate || isStale(lastUpdate)) {
                tickersToUpdate.push(t);
            } else {
                results.push({ ticker: t, status: 'success', message: 'Cached (Fresh)' });
            }
        });
    }

    if (tickersToUpdate.length === 0) return results;

    const BATCH_SIZE = 3;
    for (let i = 0; i < tickersToUpdate.length; i += BATCH_SIZE) {
        const batch = tickersToUpdate.slice(i, i + BATCH_SIZE);
        
        await Promise.all(batch.map(async (ticker) => {
            try {
                const res = await fetch(`/api/update-stock?ticker=${ticker}&force=${force}`);
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
                    try {
                        const { quotes } = await getQuotes([ticker]);
                        if(quotes.length > 0) {
                             results.push({
                                ticker,
                                status: 'success', 
                                details: { price: quotes[0].regularMarketPrice },
                                message: 'Fallback to Brapi (Scraper Failed)'
                            });
                        } else {
                            throw new Error(data.error);
                        }
                    } catch {
                        throw new Error(data.error || 'Falha na resposta da API');
                    }
                }
            } catch (e: any) {
                console.warn(`Falha ao atualizar ${ticker}`, e);
                results.push({ ticker, status: 'error', message: e.message || 'Erro de conexão' });
            }
        }));

        if (i + BATCH_SIZE < tickersToUpdate.length) {
            await new Promise(r => setTimeout(r, 1200));
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

      const staleTickers: string[] = [];
      const metaMap = new Map<string, any>(metaData.map((m: any) => [m.ticker, m]));

      uniqueTickers.forEach(t => {
          const meta = metaMap.get(t);
          // Força update se dados críticos de ações estiverem faltando
          const isMissingStockData = meta && meta.type !== 'FII' && (!meta.ev_ebitda && !meta.roe);
          const isStaleData = !meta || isStale(meta.updated_at);
          
          if (isStaleData || isMissingStockData || forceRefresh) {
              staleTickers.push(t);
          }
      });

      if (staleTickers.length > 0) {
          triggerScraperUpdate(staleTickers, forceRefresh).catch(console.error);
      }

      const dividends: DividendReceipt[] = dividendsData.map((d: any) => ({
            id: d.id,
            ticker: d.ticker,
            type: d.type,
            dateCom: d.date_com, 
            paymentDate: d.payment_date,
            rate: Number(d.rate),
            quantityOwned: 0, 
            totalReceived: 0
      }));

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
