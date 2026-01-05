
import { GoogleGenAI, Type } from "@google/genai";
import { DividendReceipt, AssetType, AssetFundamentals, MarketIndicators } from "../types";
import { supabase } from "./supabase";

export interface UnifiedMarketData {
  dividends: DividendReceipt[];
  metadata: Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }>;
  indicators?: MarketIndicators;
  error?: string;
}

// CACHE KEY e MODELO ATUALIZADOS
export const GEMINI_CACHE_KEY = 'investfiis_market_data_cache_v15_flash'; 
const LOCKED_MODEL_ID = "gemini-2.5-flash";

// Variável para rastrear requisições em andamento (Deduplicação)
let activeRequest: { key: string, promise: Promise<UnifiedMarketData> } | null = null;

const normalizeDate = (dateStr: any): string => {
  if (!dateStr) return '';
  const s = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const brMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    let year = brMatch[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }
  return '';
};

const normalizeValue = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  let str = String(val).trim().replace(/[^\d.,-]/g, '');
  if (!str) return 0;
  if (str.includes(',') && str.includes('.')) {
    str = str.lastIndexOf(',') > str.lastIndexOf('.') ? str.replace(/\./g, '').replace(',', '.') : str.replace(/,/g, '');
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
};

const fetchStoredDividends = async (tickers: string[]): Promise<DividendReceipt[]> => {
    try {
        const { data, error } = await supabase
            .from('market_dividends')
            .select('*')
            .in('ticker', tickers);
        if (error || !data) return [];
        return data.map((d: any) => ({
            id: d.id,
            ticker: d.ticker,
            type: d.type,
            dateCom: d.date_com,
            paymentDate: d.payment_date,
            rate: Number(d.rate),
            quantityOwned: 0,
            totalReceived: 0
        }));
    } catch (e) { return []; }
};

const upsertDividendsToCloud = async (dividends: any[]) => {
    if (dividends.length === 0) return;
    const dbPayload = dividends.map(d => ({
        ticker: d.ticker,
        type: d.type,
        date_com: d.dateCom,
        payment_date: d.paymentDate,
        rate: d.rate
    }));
    try {
        await supabase.from('market_dividends').upsert(dbPayload, { 
            onConflict: 'ticker, type, date_com, payment_date, rate',
            ignoreDuplicates: true 
        });
    } catch (e) { console.error("Cloud sync error", e); }
};

export const fetchUnifiedMarketData = async (tickers: string[], startDate?: string, forceRefresh = false): Promise<UnifiedMarketData> => {
  if (!tickers || tickers.length === 0) return { dividends: [], metadata: {} };

  const uniqueTickers = Array.from(new Set(tickers.map(t => t.toUpperCase())));
  const tickerKey = uniqueTickers.slice().sort().join('|');

  // 1. DEDUPLICAÇÃO DE REQUISIÇÕES
  // Se já existe uma requisição idêntica em andamento, retorna a promise dela.
  // Isso evita chamadas duplas do StrictMode ou updates rápidos.
  if (activeRequest && activeRequest.key === tickerKey && !forceRefresh) {
      console.log(`🔄 [Gemini] Reutilizando requisição em andamento para ${uniqueTickers.length} ativos`);
      return activeRequest.promise;
  }

  // 2. ESTRATÉGIA DE CACHE
  if (!forceRefresh) {
    try {
        const cachedRaw = localStorage.getItem(GEMINI_CACHE_KEY);
        if (cachedRaw) {
            const cached = JSON.parse(cachedRaw);
            // Cache válido por 6 horas
            if ((Date.now() - cached.timestamp) < (6 * 60 * 60 * 1000) && cached.tickerKey === tickerKey) {
                console.log(`📦 [Gemini] Dados recuperados do cache`);
                return cached.data;
            }
        }
    } catch (e) {}
  }

  if (!process.env.API_KEY) return { dividends: [], metadata: {}, error: "API_KEY ausente" };

  // Função interna que realiza o fetch real
  const fetchTask = async (): Promise<UnifiedMarketData> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const todayISO = new Date().toISOString().split('T')[0];
        const storedDividends = await fetchStoredDividends(uniqueTickers);

        console.log(`🤖 [Gemini] Iniciando requisição única para ${uniqueTickers.length} ativos...`);

        const systemInstruction = `Você é um API Gateway financeiro B3.
        OBJETIVO: Retornar um JSON único com dados RECENTES de TODOS os tickers solicitados em UMA ÚNICA resposta.
        
        REGRAS:
        1. Use Google Search para validar proventos recentes (últimos 12 meses).
        2. Data Com: Data limite para ter o papel.
        3. Fundamentos: P/VP, DY e Sentimento.
        4. JCP: Indique valor bruto se necessário.`;

        const prompt = `
        ANALISAR: ${uniqueTickers.join(', ')}
        PERÍODO: ${startDate || '1 ano atrás'} até ${todayISO}.
        
        RETORNO JSON OBRIGATÓRIO (Schema):
        {
          "sys": { "ipca_12m": number },
          "assets": [
            {
              "ticker": "TICKER",
              "segment": "Setor",
              "fundamentals": { "pvp": number, "dy": number, "liq": "string", "mcap": "string", "sentiment": "string", "reason": "short text" },
              "history": [
                { "com": "YYYY-MM-DD", "pay": "YYYY-MM-DD", "val": number, "type": "DIVIDENDO|JCP" }
              ]
            }
          ]
        }`;

        const response = await ai.models.generateContent({
            model: LOCKED_MODEL_ID, 
            contents: prompt,
            config: {
                systemInstruction,
                tools: [{googleSearch: {}}],
                responseMimeType: "application/json",
                temperature: 0.1,
            },
        });
        
        const sources: {title: string, uri: string}[] = [];
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks) {
            chunks.forEach((chunk: any) => {
                if (chunk.web?.uri) {
                    sources.push({ title: chunk.web.title || 'Fonte de Mercado', uri: chunk.web.uri });
                }
            });
        }

        const rawText = response.text || "{}";
        let parsedJson;
        try {
            parsedJson = JSON.parse(rawText);
        } catch (e) {
            console.warn("JSON Parse Error, fallback empty", e);
            parsedJson = { assets: [] };
        }

        const metadata: any = {};
        const aiDividends: any[] = [];
        
        if (parsedJson.assets) {
          for (const asset of parsedJson.assets) {
              const t = asset.ticker.toUpperCase();
              metadata[t] = {
                  type: t.endsWith('11') ? AssetType.FII : AssetType.STOCK,
                  segment: asset.segment,
                  fundamentals: {
                      p_vp: normalizeValue(asset.fundamentals.pvp),
                      dy_12m: normalizeValue(asset.fundamentals.dy),
                      liquidity: asset.fundamentals.liq,
                      market_cap: asset.fundamentals.mcap,
                      sentiment: asset.fundamentals.sentiment,
                      sentiment_reason: asset.fundamentals.reason,
                      sources: sources.slice(0, 5)
                  },
              };
              
              if (asset.history) {
                asset.history.forEach((d: any) => {
                    const dCom = normalizeDate(d.com);
                    const dPay = normalizeDate(d.pay);
                    if (dCom) {
                        aiDividends.push({
                            ticker: t,
                            type: d.type || 'DIVIDENDO',
                            dateCom: dCom,
                            paymentDate: dPay || dCom,
                            rate: normalizeValue(d.val),
                        });
                    }
                });
              }
          }
        }

        upsertDividendsToCloud(aiDividends);

        // Mesclar com dados do banco (evita perda de histórico antigo)
        const combined = [...storedDividends];
        aiDividends.forEach(newDiv => {
            const isDuplicate = combined.some(old => 
                old.ticker === newDiv.ticker && 
                old.dateCom === newDiv.dateCom && 
                Math.abs(old.rate - newDiv.rate) < 0.00001
            );
            if (!isDuplicate) combined.push(newDiv);
        });
        
        const finalData = { 
            dividends: combined, 
            metadata, 
            indicators: { ipca_cumulative: normalizeValue(parsedJson.sys?.ipca_12m), start_date_used: startDate || '' }
        };
        
        // Atualiza o Cache
        localStorage.setItem(GEMINI_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), tickerKey, data: finalData }));
        return finalData;

    } catch (error: any) {
        console.error("Gemini Market Data Error:", error);
        
        // FALLBACK PARA ERRO 429 (Rate Limit)
        if (error.status === 429 || error.message?.includes('429')) {
             console.warn("⚠️ [Gemini] Rate Limit (429). Tentando usar cache antigo.");
             try {
                const cachedRaw = localStorage.getItem(GEMINI_CACHE_KEY);
                if (cachedRaw) {
                    const cached = JSON.parse(cachedRaw);
                    // Retorna cache mesmo que expirado em caso de erro 429
                    return { ...cached.data, error: "Rate limit - Dados em cache" };
                }
             } catch(e) {}
        }

        const stored = await fetchStoredDividends(uniqueTickers);
        return { dividends: stored, metadata: {}, error: error.message };
    } finally {
        // Limpa a requisição ativa para permitir novas chamadas no futuro
        if (activeRequest && activeRequest.key === tickerKey) {
            activeRequest = null;
        }
    }
  };

  // Registra a requisição ativa
  const promise = fetchTask();
  activeRequest = { key: tickerKey, promise };
  
  return promise;
};
