
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

/**
 * Executa uma pesquisa profunda na B3 via Gemini 3 Flash.
 * Focado em capturar todas as parcelas de proventos individualmente.
 */
export const fetchUnifiedMarketData = async (tickers: string[]): Promise<UnifiedMarketData> => {
  if (!tickers || tickers.length === 0) return { prices: {}, dividends: [], metadata: {} };

  // Always use { apiKey: process.env.API_KEY }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Como analista financeiro especialista em B3, pesquise os ativos: ${tickers.join(', ')}.
    
    REQUISITOS DE PRECISÃO:
    1. COTAÇÃO ATUAL: Preço de fechamento mais recente.
    2. PROVENTOS (DIVIDENDOS/JCP): Liste TODOS os pagamentos dos últimos 12 meses.
       IMPORTANTE: Se um provento foi anunciado mas será pago em múltiplas parcelas (ex: CMIG4 pagando JCP em duas datas), você DEVE retornar cada parcela como um item separado no array 'd'. Não agrupe valores que possuem datas de pagamento diferentes.
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
              "dc": "YYYY-MM-DD", (Data Com / Corte)
              "dp": "YYYY-MM-DD", (Data de Pagamento Efetivo)
              "v": 0.000000 (Valor unitário por ação/cota)
            }
          ]
        }
      ]
    }
    Use o Google Search para verificar os últimos avisos aos acionistas e cronogramas de pagamento.
  `;

  try {
    // Using gemini-3-flash-preview for general text tasks and search grounding
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

    // Directly access response.text property
    const textOutput = response.text || "";
    const parsed = cleanAndParseJSON(textOutput);
    const result: UnifiedMarketData = { 
        prices: {}, 
        dividends: [], 
        metadata: {},
        // Extract grounding sources as required by guidelines
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
            // Chave única robusta incluindo data de pagamento para evitar colisões em parcelas
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
      } );
    }

    return result;
  } catch (error: any) {
    console.error("Erro Gemini Proventos:", error);
    throw error;
  }
};
