
import { DividendReceipt, AssetType, AssetFundamentals, MarketIndicators, ScrapeResult, AssetPosition, Transaction } from "../types";
import { supabase } from "./supabase";
import { getQuotes } from "./brapiService";
import { normalizeTicker, preciseMul, parseDateToLocal, getQuantityOnDate } from "./portfolioRules";

export interface UnifiedMarketData {
  dividends: DividendReceipt[];
  metadata: Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }>;
  indicators?: { ipca_cumulative: number; cdi_cumulative?: number; start_date_used: string };
  error?: string;
}

export interface FutureDividendPrediction {
    ticker: string;
    dateCom: string;
    paymentDate: string;
    rate: number;
    projectedTotal: number;
    quantity: number;
    type: string;
    daysToDateCom: number;
    status: 'CONFIRMED'; // Agora sempre confirmado
    reasoning?: string;
}

const getTTL = () => {
    return 4 * 60 * 60 * 1000; 
};

const isStale = (dateString?: string) => {
    if (!dateString) return true;
    const lastUpdate = new Date(dateString).getTime();
    const now = Date.now();
    return (now - lastUpdate) > getTTL();
};

const parseNumberSafe = (val: any): number | undefined => {
    if (typeof val === 'number') return val;
    if (val === undefined || val === null || val === '') return undefined;
    
    // Remove R$, %, espaços
    let str = String(val).replace(/[^\d.,-]/g, '').trim();
    if (!str || str === '-') return undefined;

    // Lógica robusta de parsing
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
    return isNaN(num) ? undefined : num;
};

export const mapScraperToFundamentals = (m: any): AssetFundamentals => {
    const getVal = (...keys: string[]): any => {
        for (const k of keys) {
            if (m[k] !== undefined && m[k] !== null && m[k] !== '' && m[k] !== 'N/A') return m[k];
        }
        return undefined;
    };

    return {
        // Indicadores Gerais
        p_vp: parseNumberSafe(getVal('p_vp', 'pvp', 'vp')),
        dy_12m: parseNumberSafe(getVal('dy_12m', 'dy', 'dividend_yield', 'dividendyield')), 
        p_l: parseNumberSafe(getVal('p_l', 'pl')),
        roe: parseNumberSafe(getVal('roe')),
        
        // Rentabilidade Scraper (Prioriza chaves em inglês retornadas pela API)
        profitability_12m: parseNumberSafe(getVal('profitability_12m', 'rentabilidade_12m', 'rentabilidade12m')),
        profitability_month: parseNumberSafe(getVal('profitability_month', 'rentabilidade_mes', 'rentabilidademes')),
        profitability_2y: parseNumberSafe(getVal('profitability_2y', 'rentabilidade_2y', 'rentabilidade2y')),
        
        // Benchmarks
        benchmark_cdi_12m: parseNumberSafe(getVal('benchmark_cdi_12m')),
        benchmark_ifix_12m: parseNumberSafe(getVal('benchmark_ifix_12m')),
        benchmark_ibov_12m: parseNumberSafe(getVal('benchmark_ibov_12m')),

        // Metadados
        liquidity: getVal('liquidity', 'liquidez', 'liquidez_media_diaria') || '', 
        market_cap: getVal('market_cap', 'val_mercado', 'valor_mercado') || undefined, 
        
        // FII Específicos
        assets_value: getVal('assets_value', 'patrimonio_liquido', 'patrimonio') || undefined, 
        manager_type: getVal('manager_type', 'tipo_gestao', 'gestao') || undefined,
        management_fee: getVal('management_fee', 'taxa_adm', 'taxa_administracao') || undefined,
        vacancy: parseNumberSafe(getVal('vacancy', 'vacancia', 'vacancia_fisica')),
        last_dividend: parseNumberSafe(getVal('last_dividend', 'ultimo_rendimento')),
        properties_count: parseNumberSafe(getVal('properties_count', 'num_cotistas', 'cotistas')),
        
        // Informações Adicionais
        company_name: getVal('company_name', 'razao_social'),
        num_quotas: getVal('num_quotas', 'cotas_emitidas'),
        cnpj: getVal('cnpj'),
        mandate: getVal('mandate', 'mandato'),
        target_audience: getVal('target_audience', 'publico_alvo'),
        fund_type: getVal('fund_type', 'tipo_fundo'),
        duration: getVal('duration', 'prazo'),
        
        properties: m.properties || [], 
        
        // Ações (Stocks) Estendidas
        net_margin: parseNumberSafe(getVal('net_margin', 'margem_liquida', 'margemliquida')),
        gross_margin: parseNumberSafe(getVal('gross_margin', 'margem_bruta', 'margembruta')),
        ebit_margin: parseNumberSafe(getVal('ebit_margin', 'margem_ebit', 'margemebit')),
        payout: parseNumberSafe(getVal('payout')),
        cagr_revenue: parseNumberSafe(getVal('cagr_revenue', 'cagr_receita_5a', 'cagr_receitas', 'cagr_receita')),
        cagr_profits: parseNumberSafe(getVal('cagr_profits', 'cagr_lucros_5a', 'cagr_lucros', 'cagr_lucro')),
        net_debt_ebitda: parseNumberSafe(getVal('net_debt_ebitda', 'divida_liquida_ebitda', 'div_liq_ebitda', 'dividaliquida_ebitda')),
        net_debt_equity: parseNumberSafe(getVal('net_debt_equity', 'divida_liquida_pl', 'dividaliquidapl')),
        ev_ebitda: parseNumberSafe(getVal('ev_ebitda')),
        lpa: parseNumberSafe(getVal('lpa')),
        vpa: parseNumberSafe(getVal('vpa', 'vp_cota', 'valor_patrimonial_acao', 'valorpatrimonialcota')),
        
        updated_at: m.updated_at,
        sentiment: 'Neutro',
        sources: []
    };
};

const fetchMarketIndicators = async (): Promise<{ ipca: number, cdi: number }> => {
    let lastKnown = { ipca: 4.50, cdi: 11.25 };
    try {
        const s = localStorage.getItem('investfiis_v4_indicators');
        if (s) {
            const p = JSON.parse(s);
            if (p.ipca && typeof p.ipca === 'number') lastKnown.ipca = p.ipca;
            if (p.cdi && typeof p.cdi === 'number') lastKnown.cdi = p.cdi;
        }
    } catch {}

    try {
        const response = await fetch('/api/indicators', { 
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(5000) 
        });
        if (!response.ok) return lastKnown;
        const data = await response.json();
        return {
            ipca: data.ipca || lastKnown.ipca,
            cdi: data.cdi || lastKnown.cdi
        };
    } catch (e) {
        return lastKnown;
    }
};

export const triggerScraperUpdate = async (tickers: string[], force = false): Promise<ScrapeResult[]> => {
    // Filtra tickers vazios ou inválidos para evitar erro 400 na API
    const uniqueTickers = Array.from(new Set(tickers.map(normalizeTicker))).filter(t => t && t.length > 0);
    const results: ScrapeResult[] = [];
    
    // Batch processing
    const BATCH_SIZE = 3;
    for (let i = 0; i < uniqueTickers.length; i += BATCH_SIZE) {
        const batch = uniqueTickers.slice(i, i + BATCH_SIZE);
        
        await Promise.all(batch.map(async (ticker) => {
            try {
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

// --- ROBÔ DE PROVENTOS (SEM IA) ---
export const fetchFutureAnnouncements = async (portfolio: AssetPosition[], transactions: Transaction[]): Promise<FutureDividendPrediction[]> => {
    if (!portfolio || portfolio.length === 0) return [];

    const tickers = portfolio.map(p => normalizeTicker(p.ticker));
    
    // Busca dados desde o início do ano atual para garantir cobertura e contexto
    const startOfYear = `${new Date().getFullYear()}-01-01`;

    try {
        // 1. Dados Confirmados ("O Martelo do Supabase")
        const { data, error } = await supabase
            .from('market_dividends')
            .select('*')
            .in('ticker', tickers)
            .or(`payment_date.gte.${startOfYear},date_com.gte.${startOfYear},payment_date.is.null`)
            .order('payment_date', { ascending: true });

        if (error) {
            console.error('[Robot] Error fetching confirmed data:', error);
        }
        
        const predictions: FutureDividendPrediction[] = [];
        const now = new Date();
        now.setHours(0,0,0,0);

        if (data && data.length > 0) {
            data.forEach((div: any) => {
                const normalizedTicker = normalizeTicker(div.ticker);
                
                // --- LÓGICA DE ELEGIBILIDADE REAL ---
                // Se temos a data com, verificamos a quantidade que o usuário tinha naquela data.
                // Se não temos a data com (raro para confirmados), usamos a quantidade atual.
                let quantityAtDateCom = 0;
                if (div.date_com) {
                    quantityAtDateCom = getQuantityOnDate(normalizedTicker, div.date_com, transactions);
                } else {
                    const asset = portfolio.find(p => normalizeTicker(p.ticker) === normalizedTicker);
                    quantityAtDateCom = asset?.quantity || 0;
                }

                if (quantityAtDateCom <= 0) return;

                // --- LÓGICA DE RELEVÂNCIA ---
                let isRelevant = false;
                
                if (div.payment_date) {
                    const payDate = parseDateToLocal(div.payment_date);
                    // Mostra se for futuro ou se foi nos últimos 7 dias (janela maior para conferência)
                    const recentCutoff = new Date(now);
                    recentCutoff.setDate(recentCutoff.getDate() - 7);
                    
                    if (payDate && payDate >= recentCutoff) isRelevant = true;
                } else {
                    // Sem data de pagamento = A Definir
                    if (div.date_com) {
                        const dCom = parseDateToLocal(div.date_com);
                        // Se data com foi nos últimos 90 dias e ainda não pagou, é relevante
                        const comCutoff = new Date(now);
                        comCutoff.setDate(comCutoff.getDate() - 90);
                        
                        if (dCom && dCom >= comCutoff) isRelevant = true;
                    } else {
                        isRelevant = true;
                    }
                }

                if (!isRelevant) return;

                const rate = Number(div.rate);
                if (rate <= 0) return;

                const total = preciseMul(quantityAtDateCom, rate);
                
                const dateCom = div.date_com ? parseDateToLocal(div.date_com) : null;
                const refDate = dateCom || now;
                const diffTime = refDate.getTime() - now.getTime();
                const daysToDateCom = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

                predictions.push({
                    ticker: normalizedTicker,
                    dateCom: div.date_com || 'Já ocorreu',
                    paymentDate: div.payment_date || 'A Definir',
                    rate: rate,
                    quantity: quantityAtDateCom,
                    projectedTotal: total,
                    type: div.type || 'DIV', 
                    daysToDateCom,
                    status: 'CONFIRMED', 
                    reasoning: `Confirmado: ${div.type} para quem possuía em ${div.date_com || 'data com'}`
                });
            });
        }

        return predictions.sort((a,b) => {
            const getSortDate = (p: FutureDividendPrediction) => {
                if (p.paymentDate !== 'A Definir') return p.paymentDate;
                if (p.dateCom !== 'Já ocorreu') return p.dateCom;
                return '9999-99-99';
            };
            return getSortDate(a).localeCompare(getSortDate(b));
        });

    } catch (e) {
        console.error("[Robot] Fatal error:", e);
        return [];
    }
};

const UNIFIED_DATA_CACHE_KEY = 'investfiis_unified_data_cache_v2';
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

interface CachedUnifiedData {
    timestamp: number;
    data: UnifiedMarketData;
    tickers: string[];
}

export const fetchUnifiedMarketData = async (tickers: string[], startDate?: string, forceRefresh = false): Promise<UnifiedMarketData> => {
  if (!tickers || tickers.length === 0) return { dividends: [], metadata: {} };

  const uniqueTickers = Array.from(new Set(tickers.map(normalizeTicker))).sort();
  
  // 1. Load Cache
  let cachedData: CachedUnifiedData = { timestamp: 0, data: { dividends: [], metadata: {} }, tickers: [] };
  try {
      const cachedStr = localStorage.getItem(UNIFIED_DATA_CACHE_KEY);
      if (cachedStr) {
          cachedData = JSON.parse(cachedStr);
      }
  } catch (e) {
      console.warn("[DataService] Cache read error", e);
  }

  const now = Date.now();
  const isCacheExpired = (now - cachedData.timestamp) > CACHE_TTL;

  // 2. Identify missing or stale tickers
  // If forceRefresh or cache is globally expired, we treat all as missing/stale
  // Otherwise, we check individual tickers in the cache
  let tickersToFetch: string[] = [];
  
  if (forceRefresh || isCacheExpired) {
      tickersToFetch = uniqueTickers;
  } else {
      tickersToFetch = uniqueTickers.filter(t => !cachedData.tickers.includes(t) || !cachedData.data.metadata[t]);
  }

  // If no tickers need fetching, return cached data filtered for requested tickers
  if (tickersToFetch.length === 0) {
      console.log(`[DataService] Returning cached data for ${uniqueTickers.length} tickers`);
      const filteredMetadata: any = {};
      uniqueTickers.forEach(t => {
          if (cachedData.data.metadata[t]) filteredMetadata[t] = cachedData.data.metadata[t];
      });
      
      // Filter dividends for requested tickers
      const filteredDividends = cachedData.data.dividends.filter(d => uniqueTickers.includes(d.ticker));

      return {
          ...cachedData.data,
          dividends: filteredDividends,
          metadata: filteredMetadata
      };
  }

  console.log(`[DataService] Fetching data for ${tickersToFetch.length} tickers (Cache hit: ${uniqueTickers.length - tickersToFetch.length})`);

  try {
      // 3. Fetch missing/stale data
      // Batch Supabase queries to avoid URL length limits
      const BATCH_SIZE = 20;
      let dividendsData: any[] = [];
      let metaData: any[] = [];

      for (let i = 0; i < tickersToFetch.length; i += BATCH_SIZE) {
          const batch = tickersToFetch.slice(i, i + BATCH_SIZE);
          
          const [divRes, metaRes] = await Promise.all([
              supabase.from('market_dividends').select('*').in('ticker', batch),
              supabase.from('ativos_metadata').select('*').in('ticker', batch)
          ]);

          if (divRes.data) dividendsData = [...dividendsData, ...divRes.data];
          if (metaRes.data) metaData = [...metaData, ...metaRes.data];
          
          if (divRes.error) console.error('[DataService] Error fetching dividends batch:', divRes.error);
          if (metaRes.error) console.error('[DataService] Error fetching metadata batch:', metaRes.error);
      }

      const metadataMap: Record<string, any> = {};
      metaData.forEach((m: any) => { metadataMap[normalizeTicker(m.ticker)] = m; });

      // Identify which are STILL missing (not in Supabase)
      const missingInSupabase = tickersToFetch.filter(t => !metadataMap[t]);
      
      // Also check for stale data in what we just fetched (if it was a fetch)
      // or if we are forcing refresh, we might want to trigger scraper anyway
      
      // 4. Trigger Scraper for missing or stale items
      if (missingInSupabase.length > 0) {
          console.log(`[DataService] Triggering scraper for ${missingInSupabase.length} missing assets`);
          const results = await triggerScraperUpdate(missingInSupabase, true);
          
          results.forEach(r => {
              if (r.status === 'success' && r.rawFundamentals) {
                  metadataMap[normalizeTicker(r.ticker)] = r.rawFundamentals;
                  if (r.dividendsFound && r.dividendsFound.length > 0) {
                      const newDivs = r.dividendsFound.map((d: any) => ({
                          ticker: r.ticker,
                          type: d.type || 'DIV',
                          date_com: d.date_com || '',
                          payment_date: d.payment_date || '',
                          rate: d.rate
                      }));
                      dividendsData = [...dividendsData, ...newDivs];
                  }
              }
          });
      }

      // 5. Process fetched data
      const newDividends: DividendReceipt[] = dividendsData.map((d: any) => ({
            id: d.id || `${d.ticker}-${d.date_com}-${d.rate}`,
            ticker: normalizeTicker(d.ticker),
            type: d.type || 'DIV',
            dateCom: d.date_com || '', 
            paymentDate: d.payment_date || '',
            rate: Number(d.rate),
            quantityOwned: 0, 
            totalReceived: 0
      }));

      const newMetadata: Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }> = {};
      
      Object.values(metadataMap).forEach((m: any) => {
          let assetType = AssetType.STOCK;
          if (m.type === 'FII' || m.ticker.endsWith('11') || m.ticker.endsWith('11B')) {
              assetType = AssetType.FII;
          }

          const normalizedTicker = normalizeTicker(m.ticker);
          const rawSegment = m.segment || m.setor || m.segmento || m.sector || 'Geral';
          
          newMetadata[normalizedTicker] = {
              segment: rawSegment,
              type: assetType,
              fundamentals: mapScraperToFundamentals(m)
          };
      });

      const indicators = await fetchMarketIndicators();

      // 6. Merge with Cache
      // If we did a full refresh (forceRefresh or expired), we replace the cache
      // Otherwise we merge
      let finalMetadata = { ...cachedData.data.metadata };
      let finalDividends = [...cachedData.data.dividends];
      let finalTickers = [...cachedData.tickers];

      if (forceRefresh || isCacheExpired) {
          finalMetadata = newMetadata;
          finalDividends = newDividends;
          finalTickers = tickersToFetch;
      } else {
          // Merge Metadata
          Object.keys(newMetadata).forEach(t => {
              finalMetadata[t] = newMetadata[t];
              if (!finalTickers.includes(t)) finalTickers.push(t);
          });

          // Merge Dividends (remove old ones for the fetched tickers to avoid duplicates)
          finalDividends = finalDividends.filter(d => !tickersToFetch.includes(d.ticker));
          finalDividends = [...finalDividends, ...newDividends];
      }

      const fullResult: UnifiedMarketData = { 
          dividends: finalDividends, 
          metadata: finalMetadata, 
          indicators: { ipca_cumulative: indicators.ipca, cdi_cumulative: indicators.cdi, start_date_used: startDate || '' }
      };

      // 7. Update Cache
      try {
          const cacheData: CachedUnifiedData = {
              timestamp: Date.now(),
              data: fullResult,
              tickers: finalTickers
          };
          localStorage.setItem(UNIFIED_DATA_CACHE_KEY, JSON.stringify(cacheData));
      } catch (e) {
          console.warn("[DataService] Cache write error", e);
      }

      // 8. Return only requested data
      const requestedMetadata: any = {};
      uniqueTickers.forEach(t => {
          if (finalMetadata[t]) requestedMetadata[t] = finalMetadata[t];
      });
      const requestedDividends = finalDividends.filter(d => uniqueTickers.includes(d.ticker));

      return {
          dividends: requestedDividends,
          metadata: requestedMetadata,
          indicators: fullResult.indicators
      };

  } catch (error: any) {
      console.error("DataService Fatal:", error);
      return { dividends: [], metadata: {}, error: error.message };
  }
};
