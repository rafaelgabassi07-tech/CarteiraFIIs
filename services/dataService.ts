
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
    return 4 * 60 * 60 * 1000; // 4 Horas
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
        if (str.lastIndexOf(',') > str.lastIndexOf('.')) { 
             str = str.replace(/\./g, '').replace(',', '.');
        } else { 
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
            if (m[k] !== undefined && m[k] !== null && m[k] !== '') return m[k];
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
        vacancy: parseNumberSafe(getVal('vacancia', 'vacancia_fisica', 'vacanciafisica')),
        last_dividend: parseNumberSafe(getVal('ultimo_rendimento')),
        properties_count: parseNumberSafe(getVal('num_cotistas', 'cotistas')),
        
        // Ações (Stocks)
        net_margin: parseNumberSafe(getVal('margem_liquida', 'margemliquida')),
        gross_margin: parseNumberSafe(getVal('margem_bruta', 'margembruta')),
        cagr_revenue: parseNumberSafe(getVal('cagr_receita_5a', 'cagr_receitas', 'cagr_receita')),
        net_debt_ebitda: parseNumberSafe(getVal('divida_liquida_ebitda', 'div_liq_ebitda', 'dividaliquida_ebitda')),
        ev_ebitda: parseNumberSafe(getVal('ev_ebitda')),
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
            await new Promise(r => setTimeout(r, 1500));
        }
    }
    
    return results;
};

export const fetchFutureAnnouncements = async (portfolio: AssetPosition[]): Promise<FutureDividendPrediction[]> => {
    if (!portfolio || portfolio.length === 0) return [];

    const tickers = portfolio.map(p => normalizeTicker(p.ticker));
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayStr = today.toISOString().split('T')[0];

    try {
        // Query Fundamental:
        // 1. Pagamento futuro (>= hoje)
        // 2. Data Com futura (>= hoje)
        // 3. Pagamento nulo (NULL) - significa "A Definir" na base
        const { data, error } = await supabase
            .from('market_dividends')
            .select('*')
            .in('ticker', tickers)
            .or(`payment_date.gte.${todayStr},date_com.gte.${todayStr},payment_date.is.null`)
            .order('date_com', { ascending: false });

        if (error) { console.error('[Robot] Error fetching confirmed data:', error); }
        
        const predictions: FutureDividendPrediction[] = [];

        if (data && data.length > 0) {
            data.forEach((div: any) => {
                const normalizedTicker = normalizeTicker(div.ticker);
                const asset = portfolio.find(p => normalizeTicker(p.ticker) === normalizedTicker);
                if (!asset || asset.quantity <= 0) return;

                const dateCom = div.date_com ? parseDateToLocal(div.date_com) : null;
                const payDate = div.payment_date ? parseDateToLocal(div.payment_date) : null;

                // Lógica de Relevância
                let isRelevant = false;
                if (payDate && payDate >= today) isRelevant = true; // Pagamento futuro
                if (!div.payment_date) isRelevant = true; // Pagamento a definir (null)
                if (dateCom && dateCom >= today) isRelevant = true; // Data com futura

                // Filtro extra: Se já pagou (pagamento < hoje e não é null), ignora
                if (payDate && payDate < today) isRelevant = false;

                if (!isRelevant) return;

                const rate = Number(div.rate);
                if (rate <= 0) return;

                const total = preciseMul(asset.quantity, rate);
                const refDate = dateCom || today;
                const diffTime = refDate.getTime() - today.getTime();
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
        
        // Ordenação inteligente: Primeiro os que têm data, depois os "A Definir"
        return predictions.sort((a,b) => {
            const dateA = a.paymentDate === 'A Definir' ? '9999-99-99' : a.paymentDate;
            const dateB = b.paymentDate === 'A Definir' ? '9999-99-99' : b.paymentDate;
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
          const isExpired = m && m.updated_at && isStale(m.updated_at);
          // Força refresh se não tiver DY ou Preço, indicando dado incompleto
          const isIncomplete = m && (!m.dy_12m || !m.current_price);
          return !m || isExpired || isIncomplete;
      });

      const toUpdate = forceRefresh ? uniqueTickers : missingOrStale;

      if (toUpdate.length > 0) {
          console.log(`[DataService] Updating ${toUpdate.length} assets in background...`);
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
      }

      const dividends: DividendReceipt[] = dividendsData.map((d: any) => ({
            id: d.id || `${d.ticker}-${d.date_com}-${d.rate}`,
            ticker: normalizeTicker(d.ticker),
            type: d.type,
            dateCom: d.date_com, 
            paymentDate: d.payment_date, // Pode vir null do DB
            rate: Number(d.rate),
            quantityOwned: 0, 
            totalReceived: 0
      }));

      // Deduplicação básica
      const uniqueDividends = Array.from(new Map(dividends.map(item => [
          `${item.ticker}-${item.dateCom}-${item.rate}-${item.type}`, item
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
