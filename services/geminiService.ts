
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
    Consulte fontes oficiais recentes para: ${tickerListString}.
    
    Gere um JSON VÁLIDO com a seguinte estrutura:
    {
      "assets": [
        {
          "t": "TICKER",
          "s": "Setor",
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
    
    REGRAS DE OURO PARA UNICIDADE:
    1. Um provento é ÚNICO pela combinação de TICKER + MÊS/ANO da DATA COM + TIPO.
    2. Ignore variações pequenas no dia exato do pagamento se for o mesmo mês de competência.
    3. Retorne APENAS o JSON, sem markdown.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    if (!response.text) throw new Error("Resposta vazia");

    let jsonStr = response.text.trim();
    if (jsonStr.includes('```')) {
        jsonStr = jsonStr.replace(/```json|```/g, '').trim();
    }

    const parsed = JSON.parse(jsonStr);
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
                if (!div.dc || !div.v) return;
                
                // ID Robusto: Ticker + Ano/Mes da Data Com + Tipo
                // Isso evita duplicar se a IA variar o dia do pagamento ou o valor exato
                const dateParts = div.dc.split('-');
                const monthYear = `${dateParts[0]}-${dateParts[1]}`;
                const type = div.ty?.toUpperCase() || "DIVIDENDO";
                const divId = `${ticker}-${monthYear}-${type}`.replace(/[^a-zA-Z0-9]/g, '');
                
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
    console.error("Erro Gemini:", error);
    throw error;
  }
};
