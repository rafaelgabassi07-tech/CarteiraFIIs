
import { GoogleGenAI, Type } from "@google/genai";
import { DividendReceipt, AssetType, AssetFundamentals, MarketIndicators } from "../types";
import { supabase } from "./supabase";

export interface UnifiedMarketData {
  dividends: DividendReceipt[];
  metadata: Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }>;
  indicators?: MarketIndicators;
  error?: string;
}

// Configuração Estrita: Gemini 2.5 Flash
const GEMINI_CACHE_KEY = 'investfiis_gemini_v23_25flash_strict_search'; 
const LOCKED_MODEL_ID = "gemini-2.5-flash";

// Robust API Key Retrieval
const getApiKey = () => {
    const viteKey = (import.meta as any).env?.VITE_API_KEY;
    if (viteKey) return viteKey;
    try {
        return process.env.API_KEY;
    } catch {
        return undefined;
    }
};

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

  // 1. Verificação de Cache Local (Performance First)
  if (!forceRefresh) {
    try {
        const cachedRaw = localStorage.getItem(GEMINI_CACHE_KEY);
        if (cachedRaw) {
            const cached = JSON.parse(cachedRaw);
            if ((Date.now() - cached.timestamp) < (4 * 60 * 60 * 1000) && cached.tickerKey === tickerKey) {
                return cached.data;
            }
        }
    } catch (e) {}
  }

  const apiKey = getApiKey();
  if (!apiKey) return { dividends: [], metadata: {}, error: "API_KEY ausente" };

  // Estrutura do Prompt Simplificada para Requisição Única
  const systemInstruction = `
  VOCÊ É UM AGENTE DE DADOS B3.
  USE A FERRAMENTA "GoogleSearch" UMA ÚNICA VEZ PARA BUSCAR TUDO.
  RETORNE JSON APENAS.
  `;

  const prompt = `
  ATIVOS: ${uniqueTickers.join(', ')}
  DATA INICIO: ${startDate || '2024-01-01'}
  
  TAREFA ÚNICA:
  1. Busque o valor exato do "IPCA acumulado 12 meses Brasil" hoje.
  2. Para CADA ativo listado, busque: 
     - Dividendos anunciados desde a data de inicio.
     - P/VP atual.
     - DY (Dividend Yield) 12 meses.
     - Segmento de atuação.
  `;

  const marketDataSchema = {
    type: Type.OBJECT,
    properties: {
      sys: {
        type: Type.OBJECT,
        properties: {
          ipca_12m: { type: Type.NUMBER, description: "IPCA acumulado 12 meses" }
        }
      },
      assets: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            ticker: { type: Type.STRING },
            segment: { type: Type.STRING },
            type: { type: Type.STRING, description: "FII ou ACAO" },
            fundamentals: {
              type: Type.OBJECT,
              properties: {
                pvp: { type: Type.NUMBER, nullable: true },
                dy: { type: Type.NUMBER, nullable: true },
                mcap: { type: Type.STRING, nullable: true },
                liq: { type: Type.STRING, nullable: true },
                sentiment: { type: Type.STRING, nullable: true },
                reason: { type: Type.STRING, nullable: true }
              },
              nullable: true
            },
            history: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  com: { type: Type.STRING, description: "Data Com (YYYY-MM-DD)" },
                  pay: { type: Type.STRING, description: "Data Pagamento (YYYY-MM-DD)" },
                  val: { type: Type.NUMBER, description: "Valor do provento" },
                  type: { type: Type.STRING, description: "DIV, JCP ou REND" }
                }
              }
            }
          }
        }
      }
    }
  };

  try {
      // --- SINGLE REQUEST EXECUTION (NO RETRIES) ---
      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
          model: LOCKED_MODEL_ID, 
          contents: prompt,
          config: {
              systemInstruction,
              tools: [{googleSearch: {}}], 
              temperature: 0.1,
              responseMimeType: "application/json", 
              responseSchema: marketDataSchema
          },
      });
      
      // Processamento da Resposta
      const sources: {title: string, uri: string}[] = [];
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
          chunks.forEach((chunk: any) => {
              if (chunk.web?.uri) {
                  sources.push({ title: chunk.web.title || 'Fonte Web', uri: chunk.web.uri });
              }
          });
      }

      let parsedJson: any = { assets: [] };
      try {
          if (response.text) {
              parsedJson = JSON.parse(response.text);
          }
      } catch (parseError) {
          console.warn("Gemini: Erro no parse JSON.", parseError);
      }

      const metadata: any = {};
      const aiDividends: any[] = [];
      
      if (parsedJson.assets && Array.isArray(parsedJson.assets)) {
        for (const asset of parsedJson.assets) {
            const t = asset.ticker?.toUpperCase() || "UNKNOWN";
            
            metadata[t] = {
                type: asset.type === 'FII' ? AssetType.FII : AssetType.STOCK,
                segment: asset.segment || 'Geral',
                fundamentals: {
                    p_vp: normalizeValue(asset.fundamentals?.pvp),
                    dy_12m: normalizeValue(asset.fundamentals?.dy),
                    liquidity: asset.fundamentals?.liq || '-',
                    market_cap: asset.fundamentals?.mcap || '-',
                    sentiment: asset.fundamentals?.sentiment || 'Neutro',
                    sentiment_reason: asset.fundamentals?.reason || 'Análise automática',
                    sources: sources.slice(0, 3)
                },
            };
            
            if (asset.history && Array.isArray(asset.history)) {
              asset.history.forEach((d: any) => {
                  const dCom = normalizeDate(d.com);
                  const dPay = normalizeDate(d.pay);
                  if (dCom && d.val > 0) {
                      aiDividends.push({
                          ticker: t,
                          type: d.type || 'REND',
                          dateCom: dCom,
                          paymentDate: dPay || dCom,
                          rate: normalizeValue(d.val),
                      });
                  }
              });
            }
        }
      }

      // Sync Cloud (Fire and forget para não travar a UI)
      upsertDividendsToCloud(aiDividends);

      // Merge com dados do Supabase
      const storedDividends = await fetchStoredDividends(uniqueTickers);
      const combined = [...storedDividends];
      
      aiDividends.forEach(newDiv => {
          const exists = combined.some(old => 
              old.ticker === newDiv.ticker && 
              old.dateCom === newDiv.dateCom && 
              Math.abs(old.rate - newDiv.rate) < 0.001
          );
          if (!exists) combined.push(newDiv);
      });
      
      const finalData = { 
          dividends: combined, 
          metadata, 
          indicators: { 
              ipca_cumulative: normalizeValue(parsedJson.sys?.ipca_12m), 
              start_date_used: startDate || '' 
          }
      };
      
      // Salva no Cache
      localStorage.setItem(GEMINI_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), tickerKey, data: finalData }));
      return finalData;

  } catch (error: any) {
      console.error("Gemini Single Request Error:", error);
      
      // Fallback imediato se a requisição única falhar
      const storedFallback = await fetchStoredDividends(uniqueTickers);
      return { 
          dividends: storedFallback, 
          metadata: {}, 
          error: error.message || 'Erro na requisição única do Gemini' 
      };
  }
};
