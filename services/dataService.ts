
import { DividendReceipt, AssetType, AssetFundamentals, MarketIndicators, ScrapeResult } from "../types";
import { supabase } from "./supabase";
import { getQuotes } from "./brapiService";

export interface UnifiedMarketData {
  dividends: DividendReceipt[];
  metadata: Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }>;
  indicators?: MarketIndicators;
  error?: string;
}

// --- INTELLIGENT CACHE CONFIG ---
const getTTL = () => {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    
    // Se for fim de semana ou fora do horário de pregão (10h as 18h), cache longo (4 horas)
    // Isso economiza MUITO recurso quando o mercado está parado.
    const isMarketOpen = day >= 1 && day <= 5 && hour >= 10 && hour < 18;
    
    // Mercado Aberto: 20 minutos de cache
    // Mercado Fechado: 4 horas
    return isMarketOpen ? 20 * 60 * 1000 : 4 * 60 * 60 * 1000;
};

const isStale = (dateString?: string) => {
    if (!dateString) return true;
    const lastUpdate = new Date(dateString).getTime();
    const now = Date.now();
    return (now - lastUpdate) > getTTL();
};

// --- HELPERS ---

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
            signal: AbortSignal.timeout(5000) 
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
        net_margin: parseNumberSafe(getVal('margem_liquida', 'net_margin')),
        gross_margin: parseNumberSafe(getVal('margem_bruta', 'gross_margin')),
        cagr_revenue: parseNumberSafe(getVal('cagr_receita', 'cagr_receita_5a')),
        cagr_profits: parseNumberSafe(getVal('cagr_lucro', 'cagr_lucros_5a')),
        net_debt_ebitda: parseNumberSafe(getVal('divida_liquida_ebitda', 'net_debt_ebitda')),
        ev_ebitda: parseNumberSafe(getVal('ev_ebitda')),
        lpa: parseNumberSafe(getVal('lpa')),
        vpa: parseNumberSafe(getVal('vpa', 'vp_cota', 'vp')),
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

/**
 * Função de Gatilho Inteligente.
 * Só chama a API Serverless se realmente necessário ou forçado.
 */
export const triggerScraperUpdate = async (tickers: string[], force = false): Promise<ScrapeResult[]> => {
    const uniqueTickers = Array.from(new Set(tickers.map(normalizeTickerRoot)));
    const results: ScrapeResult[] = [];
    
    // Filtra quais tickers realmente precisam de update
    const tickersToUpdate: string[] = [];

    if (force) {
        tickersToUpdate.push(...uniqueTickers);
    } else {
        // Checa metadata local ou no DB antes de decidir
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
                // Simula sucesso imediato pois já está atualizado
                results.push({
                    ticker: t,
                    status: 'success',
                    message: 'Cached (Fresh)'
                });
            }
        });
    }

    if (tickersToUpdate.length === 0) return results;

    // Processa apenas os "stale" ou faltantes
    const BATCH_SIZE = 3;
    
    for (let i = 0; i < tickersToUpdate.length; i += BATCH_SIZE) {
        const batch = tickersToUpdate.slice(i, i + BATCH_SIZE);
        
        await Promise.all(batch.map(async (ticker) => {
            try {
                // Passa flag force=true para a API saber que o cliente já validou a necessidade
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
                    // Se falhar, tentamos recuperar dados parciais do Brapi direto no front como fallback
                    try {
                        const { quotes } = await getQuotes([ticker]);
                        if(quotes.length > 0) {
                             results.push({
                                ticker,
                                status: 'success', // Partial success
                                details: { price: quotes[0].regularMarketPrice },
                                message: 'Fallback to Brapi'
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
                results.push({
                    ticker,
                    status: 'error',
                    message: e.message || 'Erro de conexão'
                });
            }
        }));

        if (i + BATCH_SIZE < tickersToUpdate.length) {
            await new Promise(r => setTimeout(r, 1200));
        }
    }
    
    return results;
};

/**
 * Busca unificada que prioriza o Banco de Dados.
 * Se os dados estiverem lá e não forem muito antigos, retorna eles.
 * Se estiverem velhos, agenda uma atualização em background (Stale-While-Revalidate).
 */
export const fetchUnifiedMarketData = async (tickers: string[], startDate?: string, forceRefresh = false): Promise<UnifiedMarketData> => {
  if (!tickers || tickers.length === 0) return { dividends: [], metadata: {} };

  const uniqueTickers = Array.from(new Set(tickers.map(normalizeTickerRoot)));

  try {
      // 1. Fetch Rápido do Supabase (Sempre a fonte da verdade)
      const [divResponse, metaResponse] = await Promise.all([
          supabase.from('market_dividends').select('*').in('ticker', uniqueTickers),
          supabase.from('ativos_metadata').select('*').in('ticker', uniqueTickers)
      ]);

      const dividendsData = divResponse.data || [];
      const metaData = metaResponse.data || [];

      // 2. Identifica ativos desatualizados (Stale)
      const staleTickers: string[] = [];
      const metaMap = new Map<string, any>(metaData.map((m: any) => [m.ticker, m]));

      uniqueTickers.forEach(t => {
          const meta = metaMap.get(t);
          if (!meta || isStale(meta.updated_at) || forceRefresh) {
              staleTickers.push(t);
          }
      });

      // 3. Dispara atualização em background (Fire & Forget) para não travar a UI
      // O usuário vê os dados "velhos" instantaneamente, e na próxima recarga vê os novos.
      if (staleTickers.length > 0) {
          console.log(`[SmartSync] Atualizando ${staleTickers.length} ativos em background...`);
          // Não aguarda a promessa (fire & forget)
          triggerScraperUpdate(staleTickers, forceRefresh).then(() => {
              console.log('[SmartSync] Atualização em background concluída.');
          }).catch(console.error);
      }

      // 4. Monta o objeto de retorno com o que tem no banco (rápido)
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

          const normalizedTicker = m.ticker.trim().toUpperCase();
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
