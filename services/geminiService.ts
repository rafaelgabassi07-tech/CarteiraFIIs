
import { GoogleGenAI } from "@google/genai";
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
    Atue como um Especialista em Dados de Mercado da B3 (Brasil).
    Consulte fontes oficiais recentes (últimos 12 meses) para: ${tickerListString}.
    
    Gere um JSON VÁLIDO com a seguinte estrutura:
    {
      "assets": [
        {
          "t": "TICKER (Ex: PETR4)",
          "s": "Setor ou Segmento",
          "type": "FII" ou "ACAO",
          "d": [
            { 
              "ty": "DIVIDENDO" ou "JCP", 
              "dc": "Data Com (YYYY-MM-DD)", 
              "dp": "Data Pagamento (YYYY-MM-DD)", 
              "v": Valor (number)
            }
          ]
        }
      ]
    }
    
    REGRAS CRÍTICAS:
    - Retorne APENAS o JSON, sem blocos de código markdown (sem \`\`\`json).
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
        // responseMimeType e responseSchema removidos pois conflitam com googleSearch
      }
    });

    if (!response.text) {
        throw new Error("Resposta vazia do Gemini");
    }

    let jsonStr = response.text.trim();
    // Limpeza robusta de Markdown caso o modelo ignore a instrução negativa
    if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json/, '').replace(/```$/, '');
    } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```/, '').replace(/```$/, '');
    }
    jsonStr = jsonStr.trim();

    const parsed = JSON.parse(jsonStr);
    
    // Extração de fontes (Grounding)
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks as any[];
    
    const result: UnifiedMarketData = { 
        dividends: [], 
        metadata: {},
        sources: groundingChunks?.filter((chunk: any) => chunk?.web?.uri) || []
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
