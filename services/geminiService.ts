
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
    
    REGRAS CRÍTICAS PARA EVITAR DUPLICIDADE:
    - Um provento é único pela combinação de TICKER + DATA COM + DATA PAGAMENTO + TIPO.
    - Se houver Dividendos e JCP na mesma data, trate como dois itens distintos.
    - Datas no formato YYYY-MM-DD.
    - Retorne APENAS o JSON, sem blocos de código markdown.
    - PROIBIDO: Não retorne cotações ou valores de mercado.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    if (!response.text) {
        throw new Error("Resposta vazia do Gemini");
    }

    let jsonStr = response.text.trim();
    if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json/, '').replace(/```$/, '');
    } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```/, '').replace(/```$/, '');
    }
    jsonStr = jsonStr.trim();

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
                
                // Novo ID Único: Ticker + DataCom + DataPagto + Tipo
                // Removido o valor do ID para que se o valor mudar na IA, ele apenas atualize o registro.
                const type = div.ty?.toUpperCase() || "PROVENTO";
                const paymentDate = div.dp || div.dc;
                const divId = `${ticker}-${div.dc}-${paymentDate}-${type}`.replace(/[^a-zA-Z0-9]/g, '');
                
                result.dividends.push({
                    id: divId,
                    ticker,
                    type: type,
                    dateCom: div.dc,
                    paymentDate: paymentDate,
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
    console.error("Erro na Sincronização Gemini:", error);
    throw error;
  }
};
