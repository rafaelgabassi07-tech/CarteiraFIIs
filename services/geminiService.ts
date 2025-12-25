
import { GoogleGenAI, Type } from "@google/genai";
import { DividendReceipt, AssetType } from "../types";

export interface UnifiedMarketData {
  prices: Record<string, number>;
  dividends: DividendReceipt[];
  metadata: Record<string, { segment: string; type: AssetType }>;
  sources?: { web: { uri: string; title: string } }[];
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

export const fetchUnifiedMarketData = async (tickers: string[]): Promise<UnifiedMarketData> => {
  if (!tickers || tickers.length === 0) return { prices: {}, dividends: [], metadata: {} };

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Como analista B3, pesquise os ativos: ${tickers.join(', ')}.
    
    REQUISITOS OBRIGATÓRIOS:
    1. COTAÇÃO ATUAL (Price) em R$.
    2. HISTÓRICO COMPLETO de dividendos/JCP com 'Data Com' nos últimos 12 meses (inclua datas passadas para cálculo de rendimento acumulado).
    3. SEGMENTO e TIPO (FII ou ACAO).
    
    Retorne APENAS um objeto JSON no formato:
    {
      "assets": [
        {
          "t": "TICKER",
          "p": 0.00,
          "s": "Segmento",
          "type": "FII|ACAO",
          "d": [{"ty": "DIVIDENDO|JCP", "dc": "YYYY-MM-DD", "dp": "YYYY-MM-DD", "v": 0.00}]
        }
      ]
    }
    Use o Google Search para precisão máxima nos proventos do último ano.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
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

    const textOutput = response.text || "";
    const parsed = cleanAndParseJSON(textOutput);
    const result: UnifiedMarketData = { 
        prices: {}, 
        dividends: [], 
        metadata: {},
        sources: (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) || []
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
            result.dividends.push({
              id: `${ticker}-${div.dc}-${div.v}`,
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
      } );
    }

    return result;
  } catch (error: any) {
    console.error("Erro Crítico Gemini:", error);
    throw error;
  }
};
