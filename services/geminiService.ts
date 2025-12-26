
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

  // Instrução reforçada para retornar JSON sem usar o modo estrito de schema (incompatível com tools)
  const prompt = `
    Atue como Especialista B3.
    Use a Google Search para obter dados oficiais e RECENTES para: ${tickerListString}.
    Retorne proventos (dividendos/JCP) anunciados ou pagos nos últimos 12 meses.
    
    REGRA DE FORMATAÇÃO OBRIGATÓRIA:
    Responda EXCLUSIVAMENTE um objeto JSON cru, sem marcação markdown, seguindo estritamente este formato:
    {
      "assets": [
        {
          "t": "TICKER",
          "s": "Segmento de Atuação",
          "type": "FII ou STOCK",
          "d": [
            {
              "ty": "DIVIDENDO ou JCP",
              "dc": "YYYY-MM-DD (Data Com)",
              "dp": "YYYY-MM-DD (Data Pagamento)",
              "v": 0.00 (Valor numérico)
            }
          ]
        }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        // REMOVIDO: responseMimeType e responseSchema causam conflito com googleSearch
      }
    });

    let text = response.text;
    if (!text) throw new Error("Resposta vazia da IA");

    // Higienização: Remove blocos de código Markdown se o modelo incluir
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const parsed = JSON.parse(text);
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    const result: UnifiedMarketData = { 
        dividends: [], 
        metadata: {},
        sources: groundingChunks?.map((chunk: any) => ({
          web: {
            uri: chunk.web?.uri || '',
            title: chunk.web?.title || ''
          }
        })).filter((s: any) => s.web.uri) || []
    };

    // Set para controle de unicidade: Ticker + DataCom + Valor
    const seenDividends = new Set<string>();

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
                
                // Gerar chave única para evitar duplicações de busca
                const uniqueKey = `${ticker}-${div.dc}-${div.v}`.replace(/\s+/g, '');
                if (seenDividends.has(uniqueKey)) return;
                seenDividends.add(uniqueKey);

                const type = div.ty?.toUpperCase() || "DIVIDENDO";
                
                result.dividends.push({
                    id: `DIV-${uniqueKey}`,
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
    console.error("Erro Crítico Gemini:", error);
    // Não relança o erro para não quebrar a UI inteira, apenas retorna vazio
    return { dividends: [], metadata: {} };
  }
};
