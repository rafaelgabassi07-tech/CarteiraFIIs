
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { DividendReceipt, AssetType } from "../types";

export interface UnifiedMarketData {
  dividends: DividendReceipt[];
  metadata: Record<string, { segment: string; type: AssetType }>;
  sources?: { web: { uri: string; title: string } }[];
}

// Schema estrito para garantir que o Gemini retorne APENAS o JSON correto
const MARKET_DATA_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    assets: {
      type: Type.ARRAY,
      description: "Lista de ativos analisados e seus dados",
      items: {
        type: Type.OBJECT,
        properties: {
          t: { type: Type.STRING, description: "Ticker do ativo (Ex: PETR4)" },
          s: { type: Type.STRING, description: "Setor ou Segmento de atuação" },
          type: { type: Type.STRING, description: "Tipo do ativo: 'FII' ou 'ACAO'" },
          d: {
            type: Type.ARRAY,
            description: "Lista de proventos",
            items: {
              type: Type.OBJECT,
              properties: {
                ty: { type: Type.STRING, description: "Tipo: 'DIVIDENDO' ou 'JCP'" },
                dc: { type: Type.STRING, description: "Data Com (YYYY-MM-DD)" },
                dp: { type: Type.STRING, description: "Data Pagamento (YYYY-MM-DD)" },
                v: { type: Type.NUMBER, description: "Valor do provento" }
              },
              required: ["ty", "dc", "dp", "v"]
            }
          }
        },
        required: ["t", "s", "type", "d"]
      }
    }
  },
  required: ["assets"]
};

export const fetchUnifiedMarketData = async (tickers: string[]): Promise<UnifiedMarketData> => {
  if (!tickers || tickers.length === 0) return { dividends: [], metadata: {} };

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const tickerListString = tickers.join(', ');

  const prompt = `
    Atue como um Especialista em Dados de Mercado da B3 (Brasil).
    Consulte fontes oficiais recentes (últimos 12 meses) para: ${tickerListString}.
    
    PARA CADA ATIVO:
    1. Classifique se é FII ou ACAO e seu setor.
    2. Liste TODOS os proventos (Dividendos/JCP) com Data Com nos últimos 12 meses.
    
    REGRAS CRÍTICAS:
    - Retorne APENAS dados confirmados.
    - Datas no formato YYYY-MM-DD.
    - Se não houver proventos, retorne array vazio em "d".
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: MARKET_DATA_SCHEMA
      }
    });

    if (!response.text) {
        throw new Error("Resposta vazia do Gemini");
    }

    // Com responseSchema, o parse é seguro e direto
    const parsed = JSON.parse(response.text);
    
    // Extração de fontes (Grounding)
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks as any[];
    
    const result: UnifiedMarketData = { 
        dividends: [], 
        metadata: {},
        sources: groundingChunks?.filter(chunk => chunk?.web?.uri) || []
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
                // Validação extra de dados antes de processar
                if (!div.dc || !div.v) return;

                const divId = `${ticker}-${div.dc}-${div.v}`.replace(/[^a-zA-Z0-9]/g, '');
                
                result.dividends.push({
                    id: divId,
                    ticker,
                    type: div.ty?.toUpperCase() || "PROVENTO",
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
    if (error.message?.includes('429')) {
        console.warn("Gemini Rate Limit (429). Aguarde.");
    }
    console.error("Erro na Sincronização Gemini:", error);
    throw error;
  }
};
