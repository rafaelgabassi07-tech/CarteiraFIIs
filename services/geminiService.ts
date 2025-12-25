
import { GoogleGenAI, Type } from "@google/genai";
import { DividendReceipt } from "../types";

export interface UnifiedMarketData {
  prices: Record<string, number>;
  dividends: DividendReceipt[];
}

/**
 * Helper to extract and parse JSON from a model response that might contain markdown blocks.
 */
function cleanAndParseJSON(text: string): any {
  try {
    // Remove markdown code blocks if present
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Failed to parse JSON from Gemini:", e);
    // Attempt to find the first '{' and last '}' as a last resort
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
 * Busca Preços e Dividendos em uma ÚNICA requisição ao Gemini.
 * Utiliza Google Search para garantir dados em tempo real.
 */
export const fetchUnifiedMarketData = async (tickers: string[]): Promise<UnifiedMarketData> => {
  if (!tickers || tickers.length === 0) return { prices: {}, dividends: [] };

  // Initialize inside the call to ensure process.env.API_KEY is latest and used as a string
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Atue como um terminal financeiro de alta precisão para a B3 (Brasil).
    PESQUISA NECESSÁRIA PARA OS ATIVOS: ${tickers.join(', ')}.
    
    TAREFAS:
    1. Obtenha a COTAÇÃO ATUAL em Reais (BRL).
    2. Liste os PROVENTOS (Dividendos e JCP) anunciados ou pagos nos últimos 12 meses.
    
    REGRAS:
    - Campo 'rate' é o valor por cota.
    - Use Google Search para validar os preços e datas.
    - Formato de data: YYYY-MM-DD.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
                  ticker: { type: Type.STRING },
                  currentPrice: { type: Type.NUMBER },
                  dividends: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        type: { type: Type.STRING },
                        dateCom: { type: Type.STRING },
                        paymentDate: { type: Type.STRING },
                        rate: { type: Type.NUMBER }
                      },
                      required: ["dateCom", "rate"]
                    }
                  }
                },
                required: ["ticker", "currentPrice"]
              }
            }
          }
        }
      }
    });

    const parsed = cleanAndParseJSON(response.text || "{}");
    
    const prices: Record<string, number> = {};
    const allDividends: DividendReceipt[] = [];

    if (parsed && parsed.assets && Array.isArray(parsed.assets)) {
      parsed.assets.forEach((asset: any) => {
        if (!asset.ticker) return;
        const ticker = asset.ticker.toUpperCase();
        prices[ticker] = asset.currentPrice;

        if (asset.dividends && Array.isArray(asset.dividends)) {
          asset.dividends.forEach((div: any) => {
            allDividends.push({
              id: `${ticker}-${div.dateCom}-${div.rate}-${Math.random().toString(36).substring(2, 7)}`,
              ticker: ticker,
              type: (div.type || 'PROVENTO').toUpperCase(),
              dateCom: div.dateCom,
              paymentDate: div.paymentDate || div.dateCom,
              rate: Number(div.rate),
              quantityOwned: 0,
              totalReceived: 0
            });
          });
        }
      });
    }

    return { prices, dividends: allDividends };

  } catch (error: any) {
    console.error("Gemini Unified Sync Error:", error);
    if (error?.status === 429) throw new Error("COTA_EXCEDIDA");
    return { prices: {}, dividends: [] };
  }
};

export const fetchDividendsViaGemini = async (tickers: string[]): Promise<DividendReceipt[]> => {
  const data = await fetchUnifiedMarketData(tickers);
  return data.dividends;
};
