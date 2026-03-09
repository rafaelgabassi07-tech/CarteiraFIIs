
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
    status: 'CONFIRMED' | 'PREDICTED';
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

const parseNumberSafe = (val: unknown): number | undefined => {
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

export const mapScraperToFundamentals = (m: Record<string, unknown>): AssetFundamentals => {
    const getVal = (...keys: string[]): unknown => {
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
        liquidity: String(getVal('liquidity', 'liquidez', 'liquidez_media_diaria') || ''), 
        market_cap: getVal('market_cap', 'val_mercado', 'valor_mercado') ? String(getVal('market_cap', 'val_mercado', 'valor_mercado')) : undefined, 
        
        // FII Específicos
        assets_value: getVal('assets_value', 'patrimonio_liquido', 'patrimonio') ? String(getVal('assets_value', 'patrimonio_liquido', 'patrimonio')) : undefined, 
        manager_type: getVal('manager_type', 'tipo_gestao', 'gestao') ? String(getVal('manager_type', 'tipo_gestao', 'gestao')) : undefined,
        management_fee: getVal('management_fee', 'taxa_adm', 'taxa_administracao') ? String(getVal('management_fee', 'taxa_adm', 'taxa_administracao')) : undefined,
        vacancy: parseNumberSafe(getVal('vacancy', 'vacancia', 'vacancia_fisica')),
        last_dividend: parseNumberSafe(getVal('last_dividend', 'ultimo_rendimento')),
        properties_count: parseNumberSafe(getVal('properties_count', 'num_cotistas', 'cotistas')),
        
        // Informações Adicionais
        company_name: String(getVal('company_name', 'razao_social')),
        num_quotas: getVal('num_quotas', 'cotas_emitidas') ? String(getVal('num_quotas', 'cotas_emitidas')) : undefined,
        cnpj: getVal('cnpj') ? String(getVal('cnpj')) : undefined,
        mandate: getVal('mandate', 'mandato') ? String(getVal('mandate', 'mandato')) : undefined,
        target_audience: getVal('target_audience', 'publico_alvo') ? String(getVal('target_audience', 'publico_alvo')) : undefined,
        fund_type: getVal('fund_type', 'tipo_fundo') ? String(getVal('fund_type', 'tipo_fundo')) : undefined,
        duration: getVal('duration', 'prazo') ? String(getVal('duration', 'prazo')) : undefined,
        
        properties: (m.properties || []) as any, 
        
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
        
        updated_at: m.updated_at ? String(m.updated_at) : undefined,
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
                results.push({ ticker, status: 'error', message: (e as any).message });
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
            .order('payment_date', { ascending: true });

        if (error) {
            console.error('[Robot] Error fetching confirmed data:', error);
        }
        
        const predictions: FutureDividendPrediction[] = [];
        const now = new Date();
        now.setHours(0,0,0,0);

        const confirmedTickers = new Set<string>();

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

                // Marca que este ticker já tem um provento confirmado para este mês/período
                const monthKey = (div.payment_date || div.date_com || '').substring(0, 7);
                if (monthKey === now.toISOString().substring(0, 7)) {
                    confirmedTickers.add(normalizedTicker);
                }

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

        // 2. Lógica Preditiva para FIIs (Heurística de Recorrência)
        // Se um FII pagou nos últimos meses mas ainda não anunciou este mês, prevemos baseado no histórico.
        portfolio.forEach(asset => {
            const ticker = normalizeTicker(asset.ticker);
            if (asset.assetType !== AssetType.FII || confirmedTickers.has(ticker)) return;

            // Busca histórico recente deste ticker no Supabase
            const history = data?.filter(d => normalizeTicker(d.ticker) === ticker) || [];
            if (history.length === 0) return;

            // Pega o último pagamento confirmado
            const last = history[history.length - 1];
            const lastDate = parseDateToLocal(last.payment_date || last.date_com);
            if (!lastDate) return;

            // Se o último pagamento foi há mais de 45 dias, talvez não seja recorrente mensal
            const daysSinceLast = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceLast > 45) return;

            // Projeta para o mês atual
            const predictedDateCom = new Date(lastDate);
            predictedDateCom.setMonth(now.getMonth());
            predictedDateCom.setFullYear(now.getFullYear());
            
            // Geralmente FIIs pagam no mesmo dia do mês anterior ou próximo
            const predictedPaymentDate = new Date(predictedDateCom);
            
            const rate = Number(last.rate);
            const total = preciseMul(asset.quantity, rate);

            predictions.push({
                ticker,
                dateCom: predictedDateCom.toISOString().split('T')[0],
                paymentDate: predictedPaymentDate.toISOString().split('T')[0],
                rate,
                quantity: asset.quantity,
                projectedTotal: total,
                type: last.type || 'REND',
                daysToDateCom: Math.ceil((predictedDateCom.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
                status: 'PREDICTED',
                reasoning: `Projeção baseada no histórico de recorrência mensal (${last.type}).`
            });
        });

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

const UNIFIED_DATA_CACHE_KEY = 'investfiis_unified_data_cache_v4';
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
      let dividendsData: Record<string, unknown>[] = [];
      let metaData: Record<string, unknown>[] = [];

      if (tickersToFetch.length > 0) {
          const [divRes, metaRes] = await Promise.all([
              supabase.from('market_dividends').select('*').in('ticker', tickersToFetch).order('payment_date', { ascending: false, nullsFirst: false }).limit(10000),
              supabase.from('ativos_metadata').select('*').in('ticker', tickersToFetch)
          ]);

          if (divRes.data) dividendsData = divRes.data;
          if (metaRes.data) metaData = metaRes.data;
          
          if (divRes.error) console.error('[DataService] Error fetching dividends:', divRes.error);
          if (metaRes.error) console.error('[DataService] Error fetching metadata:', metaRes.error);
      }

      const metadataMap: Record<string, Record<string, unknown>> = {};
      metaData.forEach((m: Record<string, unknown>) => { metadataMap[normalizeTicker(m.ticker as string)] = m; });

      // Identify which are STILL missing (not in Supabase) or if we are forcing refresh
      const missingInSupabase = tickersToFetch.filter(t => !metadataMap[t]);
      const tickersToScrape = forceRefresh ? tickersToFetch : missingInSupabase;
      
      // 4. Trigger Scraper for missing or stale items
      if (tickersToScrape.length > 0) {
          console.log(`[DataService] Triggering scraper for ${tickersToScrape.length} assets (force: ${forceRefresh})`);
          const results = await triggerScraperUpdate(tickersToScrape, true);
          
          results.forEach(r => {
              if (r.status === 'success' && r.rawFundamentals) {
                  metadataMap[normalizeTicker(r.ticker)] = r.rawFundamentals;
                  if (r.dividendsFound && r.dividendsFound.length > 0) {
                      const newDivs = r.dividendsFound.map((d: any) => ({
                          ticker: r.ticker,
                          type: d.type || 'DIV',
                          date_com: d.date_com || d.dateCom || '',
                          payment_date: d.payment_date || d.paymentDate || '',
                          rate: d.rate
                      }));
                      // Remove old dividends for this ticker to avoid duplicates if we just scraped them
                      dividendsData = dividendsData.filter((d: any) => normalizeTicker(d.ticker as string) !== normalizeTicker(r.ticker as string));
                      dividendsData = [...dividendsData, ...newDivs];
                  }
              }
          });
      }

      // 5. Process fetched data
      const newDividends: DividendReceipt[] = dividendsData.map((d: any) => ({
            id: (d.id as string) || `${d.ticker}-${d.date_com}-${d.rate}`,
            ticker: normalizeTicker(d.ticker as string),
            type: (d.type as string) || 'DIV',
            dateCom: (d.date_com as string) || (d.dateCom as string) || '', 
            paymentDate: (d.payment_date as string) || (d.paymentDate as string) || '',
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
              segment: String(rawSegment),
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
      const requestedMetadata: Record<string, any> = {};
      uniqueTickers.forEach(t => {
          if (finalMetadata[t]) requestedMetadata[t] = finalMetadata[t];
      });
      const requestedDividends = finalDividends.filter(d => uniqueTickers.includes(d.ticker));

      return {
          dividends: requestedDividends,
          metadata: requestedMetadata,
          indicators: fullResult.indicators
      };

  } catch (error: unknown) {
      console.error("DataService Fatal:", error);
      const e = error as Error;
      return { dividends: [], metadata: {}, error: e.message };
  }
};
