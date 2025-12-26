
import { GoogleGenAI } from "@google/genai";
import { DividendReceipt, AssetType } from "../types";

export interface UnifiedMarketData {
  dividends: DividendReceipt[];
  metadata: Record<string, { segment: string; type: AssetType }>;
  sources?: { web: { uri: string; title: string } }[];
}

// Service to fetch unified market data using Gemini API with Search Grounding
export const fetchUnifiedMarketData = async (tickers: string[]): Promise<UnifiedMarketData> => {
  if (!tickers || tickers.length === 0) return { dividends: [], metadata: {} };

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const tickerListString = tickers.join(', ');

  const prompt = `
    Atue como um Especialista em Auditoria de Dados da B3.
    Consulte fontes oficiais (B3, RI das empresas, StatusInvest, fundamentus) para os ativos: ${tickerListString}.
    
    Preciso dos dados de proventos (Dividendos e JCP) anunciados e históricos dos últimos 12 meses.
    
    Gere um JSON VÁLIDO:
    {
      "assets": [
        {
          "t": "TICKER",
          "s": "Setor/Segmento exato",
          "type": "FII" ou "ACAO",
          "d": [
            { 
              "ty": "DIVIDENDO" ou "JCP", 
              "dc": "Data Com - Data limite para ter o ativo (YYYY-MM-DD)", 
              "dp": "Data de Pagamento real (YYYY-MM-DD)", 
              "v": Valor bruto por cota/ação (number)
            }
          ]
        }
      ]
    }
    
    REGRAS CRÍTICAS:
    1. DIFERENCIAÇÃO: Ações pagam JCP/DIV com frequências variadas. FIIs pagam mensalmente. Verifique ambos.
    2. DATA COM: É o dado mais importante. Se um provento foi anunciado mas não pago, use a data prevista.
    3. UNICIDADE: Não duplique proventos.
    4. APENAS JSON.
  `;

  try {
    // Using gemini-3-flash-preview as it is suitable for search-grounded basic text tasks.
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", 
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
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    const result: UnifiedMarketData = { 
        dividends: [], 
        metadata: {},
        // Properly extract search grounding URLs as per guidelines and ensure type safety
        sources: groundingChunks?.map((chunk: any) => ({
          web: {
            uri: chunk.web?.uri || '',
            title: chunk.web?.title || ''
          }
        })).filter(s => s.web.uri) || []
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
                // ID único: Ticker + DataCom + Tipo para evitar duplicidade em updates
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
    console.error("Erro Gemini:", error);
    throw error;
  }
};
