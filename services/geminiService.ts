
// Use correct import for GoogleGenAI and Type
import { GoogleGenAI, Type } from "@google/genai";
import { DividendReceipt, AssetType } from "../types";

export interface UnifiedMarketData {
  dividends: DividendReceipt[];
  metadata: Record<string, { segment: string; type: AssetType }>;
  sources?: { web: { uri: string; title: string } }[];
}

export const fetchUnifiedMarketData = async (tickers: string[]): Promise<UnifiedMarketData> => {
  if (!tickers || tickers.length === 0) return { dividends: [], metadata: {} };

  // Always use { apiKey: process.env.API_KEY } for initialization as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const tickerListString = tickers.join(', ');

  const prompt = `
    Atue como Especialista B3.
    Consulte fontes oficiais para os ativos: ${tickerListString}.
    Obtenha dividendos e JCP anunciados e históricos (últimos 12 meses).
    Diferencie FIIs (mensais) de Ações (variados).
  `;

  try {
    // Using 'gemini-3-flash-preview' for basic text tasks and search grounding as recommended
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
                  t: { type: Type.STRING, description: "Ticker do ativo" },
                  s: { type: Type.STRING, description: "Segmento/Setor" },
                  type: { type: Type.STRING, description: "FII ou ACAO" },
                  d: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        ty: { type: Type.STRING, description: "DIVIDENDO ou JCP" },
                        dc: { type: Type.STRING, description: "Data Com (YYYY-MM-DD)" },
                        dp: { type: Type.STRING, description: "Data Pagamento (YYYY-MM-DD)" },
                        v: { type: Type.NUMBER, description: "Valor por cota" }
                      },
                      required: ["ty", "dc", "v"]
                    }
                  }
                },
                required: ["t", "s", "type", "d"]
              }
            }
          },
          required: ["assets"]
        }
      }
    });

    // Access the text property directly, do not call as a method
    const text = response.text;
    if (!text) throw new Error("Resposta vazia da IA");

    const parsed = JSON.parse(text);
    // Extract website URLs from groundingChunks as required by guidelines
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    const result: UnifiedMarketData = { 
        dividends: [], 
        metadata: {},
        sources: groundingChunks?.map((chunk: any) => ({
          web: {
            uri: chunk.web?.uri || '',
            title: chunk.web?.title || ''
          }
        })).filter((s: any) => s.web.uri) || []
    };

    if (parsed?.assets && Array.isArray(parsed.assets)) {
      parsed.assets.forEach((asset: any) => {
        const ticker = asset.t?.toUpperCase().trim();
        if (!ticker) return;

        result.metadata[ticker] = { 
          segment: asset.s || "Geral", 
          type: asset.type?.toUpperCase() === 'FII' ? AssetType.FII : AssetType.STOCK 
        };

        if (Array.isArray(asset.d)) {
            asset.d.forEach((div: any) => {
                if (!div.dc || !div.v) return;
                const type = div.ty?.toUpperCase() || "DIVIDENDO";
                const divId = `DIV-${ticker}-${div.dc}-${type}`.replace(/[^a-zA-Z0-9]/g, '');
                
                result.dividends.push({
                    id: divId,
                    ticker,
                    type: type,
                    dateCom: div.dc,
                    paymentDate: div.dp || div.dc,
                    rate: Number(div.v),
                    quantityOwned: 0,
                    totalReceived: 0
                });
            });
        }
      });
    }

    return result;
  } catch (error: any) {
    console.error("Erro Crítico Gemini:", error);
    throw error;
  }
};
