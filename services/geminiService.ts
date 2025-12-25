
import { GoogleGenAI, Type } from "@google/genai";
import { DividendReceipt } from "../types";

// Inicializa o cliente Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface UnifiedMarketData {
  prices: Record<string, number>;
  dividends: DividendReceipt[];
}

/**
 * Busca Preços e Dividendos em uma ÚNICA requisição ao Gemini.
 * Utiliza Google Search para garantir dados em tempo real.
 */
export const fetchUnifiedMarketData = async (tickers: string[]): Promise<UnifiedMarketData> => {
  if (!tickers || tickers.length === 0) return { prices: {}, dividends: [] };

  const prompt = `
    Atue como um terminal financeiro de alta precisão para a B3 (Brasil).
    PESQUISA NECESSÁRIA PARA OS ATIVOS: ${tickers.join(', ')}.
    
    TAREFAS EM UMA ÚNICA RESPOSTA:
    1. Obtenha a COTAÇÃO ATUAL (último preço de fechamento ou tempo real) em Reais (BRL).
    2. Liste os PROVENTOS (Dividendos/JCP) anunciados ou pagos nos últimos 12 meses.
    
    REGRAS:
    - O campo 'rate' nos dividendos é o valor por CADA UMA ação/cota.
    - Use Google Search para validar os preços e datas (RI das empresas, StatusInvest, B3).
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
                  currentPrice: { type: Type.NUMBER, description: "Preço atual do ativo em R$" },
                  dividends: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        type: { type: Type.STRING, description: "DIVIDENDO, JCP ou RENDIMENTO" },
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

    const rawData = response.text || "{}";
    const parsed = JSON.parse(rawData);
    
    const prices: Record<string, number> = {};
    const allDividends: DividendReceipt[] = [];

    if (parsed.assets && Array.isArray(parsed.assets)) {
      parsed.assets.forEach((asset: any) => {
        const ticker = asset.ticker.toUpperCase();
        prices[ticker] = asset.currentPrice;

        if (asset.dividends && Array.isArray(asset.dividends)) {
          asset.dividends.forEach((div: any) => {
            allDividends.push({
              id: `${ticker}-${div.dateCom}-${div.rate}-${Math.random().toString(36).substr(2, 5)}`,
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
    console.error("Erro na requisição unificada Gemini:", error);
    if (error?.status === 429) throw new Error("COTA_EXCEDIDA");
    return { prices: {}, dividends: [] };
  }
};

// Mantemos a função antiga para compatibilidade se necessário, mas o App agora usará a Unified
export const fetchDividendsViaGemini = async (tickers: string[]): Promise<DividendReceipt[]> => {
  const data = await fetchUnifiedMarketData(tickers);
  return data.dividends;
};
