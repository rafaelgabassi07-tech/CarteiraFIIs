
import { GoogleGenAI, Type } from "@google/genai";
import { DividendReceipt, AssetType } from "../types";

export interface UnifiedMarketData {
  prices: Record<string, number>;
  dividends: DividendReceipt[];
  metadata: Record<string, { segment: string; type: AssetType }>;
  sources?: { web: { uri: string; title: string } }[];
}

const GEMINI_CACHE_KEY = 'investfiis_gemini_internal_cache';
const CACHE_EXPIRATION = 4 * 60 * 60 * 1000; // Cache de 4 horas

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

  // Otimizamos o prompt para ser extremamente específico sobre as regras da B3
  const prompt = `
    Analise rigorosamente os ativos da B3: ${tickers.join(', ')}.
    Utilize o Google Search para encontrar fatos relevantes, avisos aos acionistas e sites de RI.
    
    OBJETIVOS:
    1. Preço de fechamento mais recente (p).
    2. Setor específico e tipo (FII ou ACAO).
    3. Lista COMPLETA de proventos (Dividendos e JCP) com Data-Com nos últimos 12 meses.
       - É CRÍTICO identificar a Data-Com (dc) correta (data de corte).
       - Identificar a Data de Pagamento (dp).
       - Valor bruto (v).
       - Tipo (ty): "DIVIDENDO" ou "JCP".

    FORMATO DE RESPOSTA (JSON APENAS):
    {
      "assets": [
        {
          "t": "TICKER",
          "p": 0.00,
          "s": "Setor/Segmento",
          "type": "FII|ACAO",
          "d": [
            {"ty": "DIVIDENDO", "dc": "YYYY-MM-DD", "dp": "YYYY-MM-DD", "v": 0.00}
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
        thinkingConfig: { thinkingBudget: 1000 },
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
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks as any[];
    
    const result: UnifiedMarketData = { 
        prices: {}, 
        dividends: [], 
        metadata: {},
        sources: groundingChunks?.filter(chunk => chunk?.web?.uri) || []
    };

    if (parsed?.assets) {
      parsed.assets.forEach((asset: any) => {
        const ticker = asset.t.toUpperCase();
        result.prices[ticker] = asset.p;
        result.metadata[ticker] = { 
          segment: asset.s || "Diversificado", 
          type: asset.type?.toUpperCase() === 'FII' ? AssetType.FII : AssetType.STOCK 
        };

        asset.d?.forEach((div: any) => {
          // Criamos um ID robusto para evitar duplicatas em merges futuros
          const divId = `${ticker}-${div.dc}-${div.v}`.replace(/[^a-zA-Z0-9]/g, '');
          result.dividends.push({
            id: divId,
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

    return result;
  } catch (error) {
    console.error("Gemini Market Data Sync Error:", error);
    throw error;
  }
};
