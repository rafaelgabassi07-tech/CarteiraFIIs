
import { GoogleGenAI, Type } from "@google/genai";
import { DividendReceipt, AssetType } from "../types";

export interface UnifiedMarketData {
  dividends: DividendReceipt[];
  metadata: Record<string, { segment: string; type: AssetType }>;
  sources?: { web: { uri: string; title: string } }[];
}

const GEMINI_CACHE_KEY = 'investfiis_gemini_internal_cache';

function cleanAndParseJSON(text: string): any {
  try {
    // Remove marcadores de código markdown se existirem
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (e) {
    // Tentativa de recuperação de JSON quebrado
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
  if (!tickers || tickers.length === 0) return { dividends: [], metadata: {} };

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Prompt otimizado para Batch Processing APENAS de Proventos e Metadados
  // Removemos explicitamente qualquer pedido de Cotação/Preço para não conflitar com a Brapi.
  const prompt = `
    Atue como um Especialista em Dados de Mercado da B3 (Brasil).
    
    Sua missão é consultar fontes oficiais recentes (últimos 12 meses) para a lista de ativos abaixo e retornar um ÚNICO JSON consolidado com foco em PROVENTOS e SEGMENTOS.
    
    LISTA DE ATIVOS: ${tickers.join(', ')} (${tickers.length} ativos no total).
    
    PARA CADA ATIVO DA LISTA, VOCÊ DEVE:
    1. Classificar o Tipo (FII ou ACAO) e o Setor/Segmento de atuação.
    2. Listar TODOS os proventos (Dividendos/JCP) com "Data Com" (Data de corte) nos últimos 12 meses.
    
    IMPORTANTE:
    - NÃO inclua preços ou cotações atuais.
    - O foco é a precisão das datas e valores de proventos.
    
    REGRAS DE DADOS:
    - Data Com (dc): A data limite para ter o ativo na carteira e receber o provento. Formato YYYY-MM-DD.
    - Data Pagamento (dp): Quando o dinheiro cai na conta. Formato YYYY-MM-DD.
    - Valor (v): Valor bruto por cota/ação.
    - Tipo (ty): "DIVIDENDO" ou "JCP".
    
    SAÍDA ESPERADA (JSON):
    {
      "assets": [
        {
          "t": "TICKER",
          "s": "Logística",
          "type": "FII",
          "d": [
            {"ty": "DIVIDENDO", "dc": "2024-01-30", "dp": "2024-02-14", "v": 0.10}
          ]
        },
        ... (repita para todos os ativos)
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 2048 }, 
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
                  // "p" (preço) removido intencionalmente
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
                required: ["t", "type"]
              }
            }
          }
        }
      }
    });

    const parsed = cleanAndParseJSON(response.text || "{}");
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks as any[];
    
    const result: UnifiedMarketData = { 
        dividends: [], 
        metadata: {},
        sources: groundingChunks?.filter(chunk => chunk?.web?.uri) || []
    };

    if (parsed?.assets) {
      parsed.assets.forEach((asset: any) => {
        const ticker = asset.t.toUpperCase();
        
        result.metadata[ticker] = { 
          segment: asset.s || "Geral", 
          type: asset.type?.toUpperCase() === 'FII' ? AssetType.FII : AssetType.STOCK 
        };

        asset.d?.forEach((div: any) => {
          // ID único baseado em Ticker + DataCom + Valor para evitar duplicidade
          const divId = `${ticker}-${div.dc}-${div.v}`.replace(/[^a-zA-Z0-9]/g, '');
          result.dividends.push({
            id: divId,
            ticker,
            type: div.ty || "PROVENTO",
            dateCom: div.dc,
            paymentDate: div.dp || div.dc, // Fallback para data com se data pagamento não existir
            rate: div.v,
            quantityOwned: 0, // Será calculado no App.tsx
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
