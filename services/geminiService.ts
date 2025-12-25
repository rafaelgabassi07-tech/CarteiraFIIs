
import { GoogleGenAI, Type } from "@google/genai";
import { DividendReceipt, AssetType } from "../types";

export interface UnifiedMarketData {
  prices: Record<string, number>;
  dividends: DividendReceipt[];
  metadata: Record<string, { segment: string; type: AssetType }>;
}

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
 * Executa uma pesquisa profunda na B3 para retornar tudo o que o app precisa.
 */
export const fetchUnifiedMarketData = async (tickers: string[]): Promise<UnifiedMarketData> => {
  if (!tickers || tickers.length === 0) return { prices: {}, dividends: [], metadata: {} };

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Aja como um analista de dados da B3. Para os ativos: ${tickers.join(', ')}.
    
    REQUISITOS:
    1. COTAÇÃO ATUAL (Price) em R$.
    2. TODOS os dividendos/JCP com 'Data Com' nos últimos 12 meses.
    3. SEGMENTO do ativo (ex: Papel, Logística, Bancos) e TIPO (FII ou ACAO).
    
    Use o Google Search para garantir que os preços refletem o mercado hoje.
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
                  t: { type: Type.STRING, description: "Ticker" },
                  p: { type: Type.NUMBER, description: "Preço atual" },
                  s: { type: Type.STRING, description: "Segmento" },
                  type: { type: Type.STRING, description: "FII ou ACAO" },
                  d: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        ty: { type: Type.STRING, description: "DIVIDENDO ou JCP" },
                        dc: { type: Type.STRING, description: "Data Com YYYY-MM-DD" },
                        dp: { type: Type.STRING, description: "Data Pagto YYYY-MM-DD" },
                        v: { type: Type.NUMBER, description: "Valor por cota" }
                      },
                      required: ["dc", "v"]
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
    const result: UnifiedMarketData = { prices: {}, dividends: [], metadata: {} };

    if (parsed?.assets) {
      parsed.assets.forEach((asset: any) => {
        const ticker = asset.t.toUpperCase();
        result.prices[ticker] = asset.p;
        result.metadata[ticker] = { 
          segment: asset.s || "Outros", 
          type: asset.type === 'FII' ? AssetType.FII : AssetType.STOCK 
        };

        if (asset.d) {
          asset.d.forEach((div: any) => {
            result.dividends.push({
              id: `${ticker}-${div.dc}-${div.v}-${Math.random().toString(36).substring(2, 7)}`,
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

    return result;
  } catch (error: any) {
    console.error("Gemini Critical Sync Error:", error);
    throw error;
  }
};
