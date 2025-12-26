
import { GoogleGenAI } from "@google/genai";
import { DividendReceipt, AssetType } from "../types";

export interface UnifiedMarketData {
  dividends: DividendReceipt[];
  metadata: Record<string, { segment: string; type: AssetType }>;
  sources?: { web: { uri: string; title: string } }[];
}

function cleanAndParseJSON(text: string): any {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0].trim());
  } catch (e) {
    console.error("Erro no parse JSON Gemini:", e);
    return null;
  }
}

export const fetchUnifiedMarketData = async (tickers: string[]): Promise<UnifiedMarketData> => {
  if (!tickers || tickers.length === 0) return { dividends: [], metadata: {} };

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Analise os ativos: ${tickers.join(', ')}.
    Use a ferramenta de busca para retornar um JSON estrito com:
    1. "s": Segmento/Setor exato do ativo (Logística, Bancos, etc).
    2. "type": "FII" ou "ACAO".
    3. "d": Histórico de dividendos/JCP dos últimos 12 meses.
    
    ESTRUTURA JSON EXIGIDA:
    {
      "assets": [
        {
          "t": "TICKER",
          "s": "Setor",
          "type": "FII",
          "d": [
            {"ty": "DIVIDENDO", "dc": "YYYY-MM-DD", "dp": "YYYY-MM-DD", "v": 0.00}
          ]
        }
      ]
    }
    Importante: Retorne apenas o JSON. Se não encontrar dividendos para um ticker, retorne a lista "d" vazia para ele.
  `;

  try {
    // Fix: Updated to gemini-3-flash-preview as recommended for text tasks with search grounding.
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const parsed = cleanAndParseJSON(response.text || "");
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks as any[];
    
    const result: UnifiedMarketData = { 
        dividends: [], 
        metadata: {},
        sources: groundingChunks?.filter(chunk => chunk?.web?.uri).map(chunk => ({
            web: { uri: chunk.web.uri, title: chunk.web.title || 'Referência de Mercado' }
        })) || []
    };

    if (parsed?.assets && Array.isArray(parsed.assets)) {
      parsed.assets.forEach((asset: any) => {
        const ticker = asset.t?.toUpperCase();
        if (!ticker) return;

        result.metadata[ticker] = { 
          segment: asset.s || "Outros", 
          type: asset.type?.toUpperCase() === 'ACAO' ? AssetType.STOCK : AssetType.FII 
        };

        if (asset.d && Array.isArray(asset.d)) {
          asset.d.forEach((div: any) => {
            const val = parseFloat(String(div.v).replace(',', '.'));
            if (!div.dc || isNaN(val)) return;
            
            result.dividends.push({
              id: `g3f-${ticker}-${div.dc}-${val}`,
              ticker,
              type: div.ty || "PROVENTO",
              dateCom: div.dc,
              paymentDate: div.dp || div.dc,
              rate: val,
              quantityOwned: 0,
              totalReceived: 0,
              assetType: result.metadata[ticker].type
            });
          });
        }
      });
    }

    return result;
  } catch (error) {
    console.error("Erro Gemini Sync:", error);
    throw error;
  }
};
