
import { DividendReceipt, AssetType, AssetFundamentals, MarketIndicators, ScrapeResult, AssetPosition } from "../types";
import { supabase } from "./supabase";
import { getQuotes } from "./brapiService";
import { normalizeTicker, preciseMul, parseDateToLocal } from "./portfolioRules";
import { predictDividendSchedule } from "./geminiService";

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
    isAiPrediction?: boolean;
    confidence?: 'ALTA' | 'MEDIA' | 'BAIXA';
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
        p_vp: parseNumberSafe(getVal('pvp', 'p_vp', 'vp')),
        dy_12m: parseNumberSafe(getVal('dy_12m', 'dy', 'dividend_yield', 'dividendyield')), 
        p_l: parseNumberSafe(getVal('pl', 'p_l')),
        roe: parseNumberSafe(getVal('roe')),
        
        // Metadados
        liquidity: getVal('liquidez', 'liquidez_media_diaria') || '', 
        market_cap: getVal('val_mercado', 'valor_mercado', 'market_cap') || undefined, 
        
        // FII Específicos
        assets_value: getVal('patrimonio_liquido', 'patrimonio', 'assets_value') || undefined, 
        manager_type: getVal('tipo_gestao', 'gestao', 'manager_type') || undefined,
        management_fee: getVal('taxa_adm', 'taxa_administracao', 'management_fee') || undefined,
        vacancy: parseNumberSafe(getVal('vacancia', 'vacancia_fisica')),
        last_dividend: parseNumberSafe(getVal('ultimo_rendimento')),
        properties_count: parseNumberSafe(getVal('num_cotistas', 'cotistas')),
        
        // Ações (Stocks)
        net_margin: parseNumberSafe(getVal('margem_liquida', 'margemliquida')),
        gross_margin: parseNumberSafe(getVal('margem_bruta', 'margembruta')),
        cagr_revenue: parseNumberSafe(getVal('cagr_receita_5a', 'cagr_receitas', 'cagr_receita')),
        cagr_profits: parseNumberSafe(getVal('cagr_lucros_5a', 'cagr_lucros', 'cagr_lucro')),
        net_debt_ebitda: parseNumberSafe(getVal('divida_liquida_ebitda', 'div_liq_ebitda', 'dividaliquida_ebitda')),
        ev_ebitda: parseNumberSafe(getVal('ev_ebitda')),
        lpa: parseNumberSafe(getVal('lpa')),
        vpa: parseNumberSafe(getVal('vp_cota', 'vpa', 'valor_patrimonial_acao', 'valorpatrimonialcota')),
        
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

// --- ROBÔ DE PROVENTOS INTELIGENTE ---
export const fetchFutureAnnouncements = async (portfolio: AssetPosition[], useAI = false): Promise<FutureDividendPrediction[]> => {
    if (!portfolio || portfolio.length === 0) return [];

    const tickers = portfolio.map(p => normalizeTicker(p.ticker));
    const today = new Date().toISOString().split('T')[0];

    try {
        // 1. Dados Confirmados ("O Martelo do Supabase")
        // Correção na query para usar OR de forma correta e pegar eventos futuros (Datacom ou Pagamento)
        const { data, error } = await supabase
            .from('market_dividends')
            .select('*')
            .in('ticker', tickers)
            .or(`payment_date.gte.${today},date_com.gte.${today},payment_date.is.null`)
            .order('payment_date', { ascending: true });

        if (error) {
            console.error('[Robot] Error fetching confirmed data:', error);
            return [];
        }
        
        const predictions: FutureDividendPrediction[] = [];
        const now = new Date();
        now.setHours(0,0,0,0);

        const blockedPeriods = new Set<string>();

        if (data && data.length > 0) {
            data.forEach((div: any) => {
                const normalizedTicker = normalizeTicker(div.ticker);
                const asset = portfolio.find(p => normalizeTicker(p.ticker) === normalizedTicker);
                
                if (!asset || asset.quantity <= 0) return;

                const rate = Number(div.rate);
                if (rate <= 0) return;

                const total = preciseMul(asset.quantity, rate);
                
                // --- CORREÇÃO DE TIMEZONE ---
                // Usa parseDateToLocal para garantir que a data seja interpretada no fuso local correto (evita D-1)
                const dateCom = div.date_com ? parseDateToLocal(div.date_com) : null;
                const paymentDateObj = div.payment_date ? parseDateToLocal(div.payment_date) : null;
                
                // Recalcula diffTime para 'Dias até Datacom'
                const refDate = dateCom || now;
                const diffTime = refDate.getTime() - now.getTime();
                const daysToDateCom = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

                // Adiciona à lista de confirmados
                predictions.push({
                    ticker: normalizedTicker,
                    dateCom: div.date_com || 'Já ocorreu',
                    paymentDate: div.payment_date || 'A Definir',
                    rate: rate,
                    quantity: asset.quantity,
                    projectedTotal: total,
                    type: div.type || 'DIV', 
                    daysToDateCom,
                    isAiPrediction: false, 
                    confidence: 'ALTA',
                    reasoning: `Confirmado: ${div.type}`
                });
                
                // Bloqueia Mês/Ano para a IA
                if (div.payment_date) {
                    const k = `${normalizedTicker}-${div.payment_date.substring(0, 7)}`; 
                    blockedPeriods.add(k);
                } 
                if (div.date_com) {
                    const k = `${normalizedTicker}-${div.date_com.substring(0, 7)}`; 
                    blockedPeriods.add(k);
                }
            });
        }

        // 2. Previsão IA (Apenas Lacunas)
        if (useAI) {
            const aiPredictions = await predictDividendSchedule(tickers);
            
            aiPredictions.forEach((pred: any) => {
                const normalizedTicker = normalizeTicker(pred.ticker);
                const asset = portfolio.find(p => normalizeTicker(p.ticker) === normalizedTicker);
                if (!asset) return;

                const predDate = pred.predictedPaymentDate || pred.predictedDateCom;
                if (!predDate) return;
                
                const predMonth = predDate.substring(0, 7); 
                const key = `${normalizedTicker}-${predMonth}`;
                
                if (blockedPeriods.has(key)) return;

                const estimatedRate = asset.last_dividend || (asset.currentPrice ? (asset.currentPrice * (asset.dy_12m || 6) / 100 / 12) : 0);
                
                if (estimatedRate > 0) {
                    const isOfficial = pred.status === 'ANUNCIADO';
                    const finalType = pred.predictionType 
                        ? `${pred.predictionType} (${isOfficial ? 'Anúncio' : 'Est.'})`
                        : 'DIV (Est.)';

                    predictions.push({
                        ticker: normalizedTicker,
                        dateCom: pred.predictedDateCom,
                        paymentDate: pred.predictedPaymentDate,
                        rate: estimatedRate,
                        quantity: asset.quantity,
                        projectedTotal: preciseMul(asset.quantity, estimatedRate),
                        type: finalType,
                        daysToDateCom: 0, 
                        isAiPrediction: true,
                        confidence: isOfficial ? 'ALTA' : pred.confidence, 
                        reasoning: pred.reasoning
                    });
                }
            });
        }

        // Ordenação final Cronológica com correção para datas 'A Definir'
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
              // Trigger background update
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
