
import { GoogleGenAI, Type } from "@google/genai";
import { DividendReceipt, AssetType } from "../types";

export interface UnifiedMarketData {
  prices: Record<string, number>;
  dividends: DividendReceipt[];
  metadata: Record<string, { segment: string; type: AssetType }>;
  sources?: { web: { uri: string; title: string } }[];
}

const GEMINI_CACHE_KEY = 'investfiis_gemini_internal_cache';
const CACHE_EXPIRATION = 12 * 60 * 60 * 1000; // 12 horas

function cleanAndParseJSON(text: string): any {
  try {
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (e) {
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      try {
        return JSON.parse(text.substring(firstBrace, lastBrace + 1));
      } catch (e2) {
        return null;
      }
    }
    return null;
  }
}

/**
 * Sistema de Cache Inteligente
 */
const getCachedData = (tickers: string[]): UnifiedMarketData | null => {
  try {
    const cached = localStorage.getItem(GEMINI_CACHE_KEY);
    if (!cached) return null;
    
    const { data, timestamp, tickers: cachedTickers } = JSON.parse(cached);
    const isExpired = Date.now() - timestamp > CACHE_EXPIRATION;
    
    // Verifica se todos os tickers solicitados estão no cache
    const hasAllTickers = tickers.every(t => cachedTickers.includes(t.toUpperCase()));
    
    if (!isExpired && hasAllTickers) {
      console.log("Gemini: Usando cache interno para", tickers);
      return data;
    }
    return null;
  } catch (e) {
    return null;
  }
};

const saveToCache = (tickers: string[], data: UnifiedMarketData) => {
  try {
    localStorage.setItem(GEMINI_CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now(),
      tickers: tickers.map(t => t.toUpperCase())
    }));
  } catch (e) {}
};

/**
 * Executa uma pesquisa profunda na B3 via Gemini 3 Pro com cache integrado.
 * Usando gemini-3-pro-preview para tarefas complexas de análise financeira.
 */
export const fetchUnifiedMarketData = async (tickers: string[]): Promise<UnifiedMarketData> => {
  if (!tickers || tickers.length === 0) return { prices: {}, dividends: [], metadata: {} };

  // 1. Tentar Cache primeiro
  const cached = getCachedData(tickers);
  if (cached) return cached;

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Como analista financeiro especialista em B3, pesquise os ativos: ${tickers.join(', ')}.
    
    REQUISITOS DE PRECISÃO:
    1. COTAÇÃO ATUAL: Preço de fechamento mais recente.
    2. PROVENTOS (DIVIDENDOS/JCP): Liste TODOS os pagamentos dos últimos 12 meses.
       IMPORTANTE: Se um provento foi anunciado mas será pago em múltiplas parcelas, retorne cada parcela separadamente.
    3. SEGMENTO e TIPO: Identifique se é FII ou ACAO.
    
    ESTRUTURA JSON OBRIGATÓRIA:
    {
      "assets": [
        {
          "t": "TICKER",
          "p": 0.00,
          "s": "Segmento",
          "type": "FII|ACAO",
          "d": [
            {
              "ty": "DIVIDENDO|JCP", 
              "dc": "YYYY-MM-DD",
              "dp": "YYYY-MM-DD",
              "v": 0.000000
            }
          ]
        }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            assets: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  t: { type: Type.STRING },
                  p: { type: Type.NUMBER },
                  s: { type: Type.STRING },
                  type: { type: Type.STRING },
                  d: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        ty: { type: Type.STRING },
                        dc: { type: Type.STRING },
                        dp: { type: Type.STRING },
                        v: { type: Type.NUMBER }
                      },
                      required: ["dc", "dp", "v"]
                    }
                  }
                },
                required: ["t", "p", "type"]
              }
            }
          }
        }
      }
    });

    const textOutput = response.text || "";
    const parsed = cleanAndParseJSON(textOutput);
    
    // Improved grounding chunks extraction for Search Grounding compliance
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks as any[];
    const result: UnifiedMarketData = { 
        prices: {}, 
        dividends: [], 
        metadata: {},
        sources: groundingChunks?.filter(chunk => chunk.web) || []
    };

    if (parsed?.assets) {
      parsed.assets.forEach((asset: any) => {
        const ticker = asset.t.toUpperCase();
        result.prices[ticker] = asset.p;
        result.metadata[ticker] = { 
          segment: asset.s || "Outros", 
          type: asset.type?.toUpperCase() === 'FII' ? AssetType.FII : AssetType.STOCK 
        };

        if (asset.d) {
          asset.d.forEach((div: any) => {
            const uniqueId = `${ticker}-${div.dc}-${div.dp}-${div.v}`;
            result.dividends.push({
              id: uniqueId,
              ticker,
              type: div.ty || "PROVENTO",
              dateCom: div.dc,
              paymentDate: div.dp || div.dc,
              rate: div.v,
              quantityOwned: 0,
              totalReceived: 0
            });
          });
        }
      });
    }

    // Salva no cache antes de retornar
    saveToCache(tickers, result);
    return result;
  } catch (error: any) {
    console.error("Erro Gemini Proventos:", error);
    throw error;
  }
};
