
import { GoogleGenAI, Type } from "@google/genai";
import { DividendReceipt, AssetType } from "../types";

export interface UnifiedMarketData {
  prices: Record<string, number>;
  dividends: DividendReceipt[];
  metadata: Record<string, { segment: string; type: AssetType }>;
  sources?: { web: { uri: string; title: string } }[];
}

const GEMINI_CACHE_KEY = 'investfiis_gemini_internal_cache';
const CACHE_EXPIRATION = 12 * 60 * 60 * 1000; // Cache de 12 horas para dados históricos

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

const getCachedData = (tickers: string[]): UnifiedMarketData | null => {
  try {
    const cached = localStorage.getItem(GEMINI_CACHE_KEY);
    if (!cached) return null;
    
    const { data, timestamp, tickers: cachedTickers } = JSON.parse(cached);
    const isExpired = Date.now() - timestamp > CACHE_EXPIRATION;
    const hasAllTickers = tickers.every(t => cachedTickers.includes(t.toUpperCase()));
    
    if (!isExpired && hasAllTickers) {
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
 * Gemini: Faz a pesquisa PESADA de dividendos e metadados em UMA ÚNICA requisição para todos os ativos.
 */
export const fetchUnifiedMarketData = async (tickers: string[]): Promise<UnifiedMarketData> => {
  if (!tickers || tickers.length === 0) return { prices: {}, dividends: [], metadata: {} };

  const cached = getCachedData(tickers);
  if (cached) return cached;

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Prompt otimizado para extração em lote único
  const prompt = `
    Aja como um terminal Bloomberg. Pesquise via Google Search os dados consolidados para ESTA LISTA de ativos da B3: ${tickers.join(', ')}.
    
    REQUISITOS OBRIGATÓRIOS:
    1. PROVENTOS: Extraia TODOS os dividendos e JCP pagos nos últimos 12 meses para cada ticker.
    2. SEGMENTAÇÃO: Defina o setor de atuação e se é FII ou ACAO.
    3. COTAÇÃO: Forneça o preço de fechamento mais recente como referência.

    Retorne EXCLUSIVAMENTE um JSON neste formato:
    {
      "assets": [
        {
          "t": "TICKER",
          "p": 0.00,
          "s": "Segmento",
          "type": "FII|ACAO",
          "d": [
            {"ty": "DIVIDENDO|JCP", "dc": "YYYY-MM-DD", "dp": "YYYY-MM-DD", "v": 0.0000}
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

    const parsed = cleanAndParseJSON(response.text || "{}");
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

        asset.d?.forEach((div: any) => {
          result.dividends.push({
            id: `${ticker}-${div.dc}-${div.dp}-${div.v}`,
            ticker,
            type: div.ty || "PROVENTO",
            dateCom: div.dc,
            paymentDate: div.dp || div.dc,
            rate: div.v,
            quantityOwned: 0,
            totalReceived: 0
          });
        });
      });
    }

    saveToCache(tickers, result);
    return result;
  } catch (error) {
    console.error("Erro Gemini Batch Sync:", error);
    throw error;
  }
};
