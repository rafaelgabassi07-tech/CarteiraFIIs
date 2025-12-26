
import { GoogleGenAI, Type } from "@google/genai";
import { DividendReceipt, AssetType } from "../types";

export interface UnifiedMarketData {
  dividends: DividendReceipt[];
  metadata: Record<string, { segment: string; type: AssetType }>;
  sources?: { web: { uri: string; title: string } }[];
}

export const fetchUnifiedMarketData = async (tickers: string[]): Promise<UnifiedMarketData> => {
  if (!tickers || tickers.length === 0) return { dividends: [], metadata: {} };

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const tickerListString = tickers.join(', ');

  const prompt = `
    Atue como Especialista B3.
    Obtenha dados oficiais para: ${tickerListString}.
    Retorne proventos (dividendos/JCP) dos últimos 12 meses.
    Inclua Data Com e Data de Pagamento.
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
                  t: { type: Type.STRING },
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

    const text = response.text;
    if (!text) throw new Error("Resposta vazia da IA");

    const parsed = JSON.parse(text);
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

    // Set para controle de unicidade: Ticker + DataCom + Valor
    const seenDividends = new Set<string>();

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
                
                // Gerar chave única para evitar duplicações de busca
                const uniqueKey = `${ticker}-${div.dc}-${div.v}`.replace(/\s+/g, '');
                if (seenDividends.has(uniqueKey)) return;
                seenDividends.add(uniqueKey);

                const type = div.ty?.toUpperCase() || "DIVIDENDO";
                
                result.dividends.push({
                    id: `DIV-${uniqueKey}`,
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
