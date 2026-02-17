
import { DividendReceipt, AssetType, AssetFundamentals, MarketIndicators, ScrapeResult, AssetPosition } from "../types";
import { supabase } from "./supabase";
import { getQuotes } from "./brapiService";
import { normalizeTicker, preciseMul, parseDateToLocal } from "./portfolioRules";

export interface UnifiedMarketData {
  dividends: DividendReceipt[];
  metadata: Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }>;
  indicators?: MarketIndicators;
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
    status: 'CONFIRMED'; 
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
    
    let str = String(val).replace(/[^\d.,-]/g, '').trim();
    if (!str || str === '-') return undefined;

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
    // Helper para buscar chaves variadas
    const getVal = (...keys: string[]): any => {
        for (const k of keys) {
            if (m[k] !== undefined && m[k] !== null && m[k] !== '' && m[k] !== 'N/A') return m[k];
        }
        return undefined;
    };

    return {
        // Indicadores Gerais
        company_name: getVal('company_name', 'razao_social'),
        cnpj: getVal('cnpj'),
        p_vp: parseNumberSafe(getVal('pvp', 'p_vp', 'vp')),
        dy_12m: parseNumberSafe(getVal('dy_12m', 'dy', 'dividend_yield', 'dividendyield')), 
        p_l: parseNumberSafe(getVal('pl', 'p_l')),
        roe: parseNumberSafe(getVal('roe')),
        
        // Rentabilidade
        profitability_month: parseNumberSafe(getVal('profitability_month')),
        profitability_real_month: parseNumberSafe(getVal('profitability_real_month')),
        profitability_3m: parseNumberSafe(getVal('profitability_3m')),
        profitability_real_3m: parseNumberSafe(getVal('profitability_real_3m')),
        profitability_12m: parseNumberSafe(getVal('profitability_12m', 'rentabilidade_12m')),
        profitability_real_12m: parseNumberSafe(getVal('profitability_real_12m')),
        profitability_2y: parseNumberSafe(getVal('profitability_2y')),
        profitability_real_2y: parseNumberSafe(getVal('profitability_real_2y')),
        
        // Benchmarks
        benchmark_cdi_12m: parseNumberSafe(getVal('benchmark_cdi_12m')),
        benchmark_ifix_12m: parseNumberSafe(getVal('benchmark_ifix_12m')),
        benchmark_ibov_12m: parseNumberSafe(getVal('benchmark_ibov_12m')),

        // Metadados
        liquidity: getVal('liquidez', 'liquidez_media_diaria'), // Pode ser string "R$ 1.2M"
        market_cap: getVal('val_mercado', 'valor_mercado', 'market_cap'), 
        
        // FII Específicos
        target_audience: getVal('target_audience'),
        mandate: getVal('mandate'),
        segment_secondary: getVal('segment_secondary', 'segmento'),
        fund_type: getVal('fund_type'),
        duration: getVal('duration'),
        num_quotas: getVal('num_quotas'),
        
        assets_value: getVal('assets_value', 'patrimonio_liquido', 'patrimonio'), 
        manager_type: getVal('manager_type', 'tipo_gestao', 'gestao'),
        management_fee: getVal('management_fee', 'taxa_adm', 'taxa_administracao'),
        vacancy: parseNumberSafe(getVal('vacancy', 'vacancia', 'vacancia_fisica')),
        last_dividend: parseNumberSafe(getVal('last_dividend', 'ultimo_rendimento')),
        properties_count: parseNumberSafe(getVal('num_cotistas', 'cotistas')), // Adaptado, as vezes cotistas vem numérico
        properties: m.properties || [], 
        
        // Ações (Stocks)
        net_margin: parseNumberSafe(getVal('margem_liquida', 'margemliquida')),
        gross_margin: parseNumberSafe(getVal('margem_bruta', 'margembruta')),
        cagr_revenue: parseNumberSafe(getVal('cagr_receita_5a', 'cagr_receitas', 'cagr_receita')),
        cagr_profits: parseNumberSafe(getVal('cagr_lucros_5a', 'cagr_lucros', 'cagr_lucro')),
        net_debt_ebitda: parseNumberSafe(getVal('divida_liquida_ebitda', 'div_liq_ebitda', 'dividaliquida_ebitda')),
        ev_ebitda: parseNumberSafe(getVal('ev_ebitda')),
        lpa: parseNumberSafe(getVal('lpa')),
        vpa: parseNumberSafe(getVal('vpa', 'vp_cota', 'valor_patrimonial_acao', 'valorpatrimonialcota')),
        
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
export const fetchFutureAnnouncements = async (portfolio: AssetPosition[]): Promise<FutureDividendPrediction[]> => {
    if (!portfolio || portfolio.length === 0) return [];

    const tickers = portfolio.map(p => normalizeTicker(p.ticker));
    
    // Busca dados desde o início do ano atual para garantir cobertura e contexto
    const startOfYear = `${new Date().getFullYear()}-01-01`;

    try {
        // 1. Dados Confirmados ("O Martelo do Supabase")
        // Trazemos tudo para o cliente filtrar, é mais seguro contra fuso horário do DB
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
        
        // Data de corte: Ontem (para não perder eventos de fuso horário de "hoje")
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 1);
        const cutoffTime = cutoffDate.getTime();

        const now = new Date();
        now.setHours(0,0,0,0);

        if (data && data.length > 0) {
            data.forEach((div: any) => {
                const normalizedTicker = normalizeTicker(div.ticker);
                const asset = portfolio.find(p => normalizeTicker(p.ticker) === normalizedTicker);
                if (!asset || asset.quantity <= 0) return;

                // --- LÓGICA DE AGENDA ---
                // Verifica se é um evento relevante (Futuro ou Recente)
                let isRelevant = false;
                
                // Pagamento
                if (div.payment_date) {
                    const payDate = parseDateToLocal(div.payment_date);
                    if (payDate && payDate.getTime() >= cutoffTime) isRelevant = true;
                } else {
                    // Sem data de pagamento = A Definir (Relevante)
                    isRelevant = true;
                }

                // Data Com (Se não pagou ainda, data com futura também é relevante)
                if (!isRelevant && div.date_com) {
                    const dCom = parseDateToLocal(div.date_com);
                    if (dCom && dCom.getTime() >= cutoffTime) isRelevant = true;
                }

                if (!isRelevant) return;

                const rate = Number(div.rate);
                if (rate <= 0) return;

                const total = preciseMul(asset.quantity, rate);
                
                const dateCom = div.date_com ? parseDateToLocal(div.date_com) : null;
                const refDate = dateCom || now;
                const diffTime = refDate.getTime() - now.getTime();
                const daysToDateCom = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

                predictions.push({
                    ticker: normalizedTicker,
                    dateCom: div.date_com || 'Já ocorreu',
                    paymentDate: div.payment_date || 'A Definir',
                    rate: rate,
                    quantity: asset.quantity,
                    projectedTotal: total,
                    type: div.type || 'DIV', 
                    daysToDateCom,
                    status: 'CONFIRMED', 
                    reasoning: `Confirmado: ${div.type}`
                });
            });
        }

        return predictions.sort((a,b) => {
            const dateA = a.paymentDate !== 'A Definir' ? a.paymentDate : (a.dateCom !== 'Já ocorreu' ? a.dateCom : '9999-99-99');
            const dateB = b.paymentDate !== 'A Definir' ? b.paymentDate : (b.dateCom !== 'Já ocorreu' ? b.dateCom : '9999-99-99');
            return dateA.localeCompare(dateB);
        });

    } catch (e) {
        console.error("[Robot] Fatal error:", e);
        return [];
    }
};

export const fetchUnifiedMarketData = async (tickers: string[], startDate?: string, forceRefresh = false): Promise<UnifiedMarketData> => {
  if (!tickers || tickers.length === 0) return { dividends: [], metadata: {} };

  const uniqueTickers = Array.from(new Set(tickers.map(normalizeTicker)));

  try {
      let [divResponse, metaResponse] = await Promise.all([
          supabase.from('market_dividends').select('*').in('ticker', uniqueTickers),
          supabase.from('ativos_metadata').select('*').in('ticker', uniqueTickers)
      ]);

      let dividendsData = divResponse.data || [];
      let metaData = metaResponse.data || [];

      const metadataMap: Record<string, any> = {};
      metaData.forEach((m: any) => { metadataMap[normalizeTicker(m.ticker)] = m; });

      const missingOrStale = uniqueTickers.filter(t => {
          const m = metadataMap[t];
          const hasSuspiciousData = m && (m.dy_12m === 0 || m.dy_12m === null || m.dy_12m === undefined || m.dy_12m === '0');
          return !m || (m.updated_at && isStale(m.updated_at)) || hasSuspiciousData;
      });

      const toUpdate = forceRefresh ? uniqueTickers : missingOrStale;

      if (toUpdate.length > 0) {
          if (forceRefresh) {
              const results = await triggerScraperUpdate(toUpdate, true);
              results.forEach(r => {
                  if (r.status === 'success' && r.rawFundamentals) {
                      metadataMap[normalizeTicker(r.ticker)] = r.rawFundamentals;
                      if (r.dividendsFound && r.dividendsFound.length > 0) {
                          const newDivs = r.dividendsFound.map((d: any) => ({
                              ticker: r.ticker,
                              type: d.type,
                              date_com: d.date_com,
                              payment_date: d.payment_date,
                              rate: d.rate
                          }));
                          dividendsData = [...dividendsData, ...newDivs];
                      }
                  }
              });
          } else {
              triggerScraperUpdate(toUpdate, true).then(results => {
                  console.log(`[DataService] Auto-correction triggered for ${results.length} assets`);
              });
          }
      }

      const dividends: DividendReceipt[] = dividendsData.map((d: any) => ({
            id: d.id || `${d.ticker}-${d.date_com}-${d.rate}`,
            ticker: normalizeTicker(d.ticker),
            type: d.type,
            dateCom: d.date_com, 
            paymentDate: d.payment_date,
            rate: Number(d.rate),
            quantityOwned: 0, 
            totalReceived: 0
      }));

      const uniqueDividends = Array.from(new Map(dividends.map(item => [
          `${item.ticker}-${item.dateCom}-${item.rate}`, item
      ])).values());

      const metadata: Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }> = {};
      
      Object.values(metadataMap).forEach((m: any) => {
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
          dividends: uniqueDividends, 
          metadata, 
          indicators: { ipca_cumulative: ipca, start_date_used: startDate || '' }
      };

  } catch (error: any) {
      console.error("DataService Fatal:", error);
      return { dividends: [], metadata: {}, error: error.message };
  }
};
