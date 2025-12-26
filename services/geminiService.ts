
import { GoogleGenAI, Type } from "@google/genai";
import { DividendReceipt, AssetType } from "../types";

export interface UnifiedMarketData {
  dividends: DividendReceipt[];
  metadata: Record<string, { segment: string; type: AssetType }>;
  sources?: { web: { uri: string; title: string } }[];
}

/**
 * Extrai e limpa o JSON da resposta do Gemini, lidando com possíveis markdown ou textos extras.
 */
function cleanAndParseJSON(text: string): any {
  try {
    // Busca o primeiro bloco que parece um objeto JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn("Nenhum bloco JSON encontrado na resposta da IA.");
      return null;
    }
    
    const cleaned = jsonMatch[0].trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Erro ao processar JSON do Gemini:", e, "Texto original:", text);
    return null;
  }
}

export const fetchUnifiedMarketData = async (tickers: string[]): Promise<UnifiedMarketData> => {
  if (!tickers || tickers.length === 0) return { dividends: [], metadata: {} };

  // Inicializa o SDK usando a API_KEY do ambiente
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Atue como um analista de investimentos da B3. 
    Use a ferramenta de busca para encontrar dividendos, JCP e o setor dos ativos: ${tickers.join(', ')}.
    
    INSTRUÇÕES PARA O MODELO GEMINI 2.5 FLASH:
    1. Identifique se é FII ou ACAO.
    2. Identifique o setor/segmento.
    3. Liste proventos dos últimos 12 meses.
    
    FORMATO OBRIGATÓRIO (JSON):
    - Data Com (dc): YYYY-MM-DD (Ex: 2024-05-10)
    - Data Pagamento (dp): YYYY-MM-DD (Ex: 2024-05-25)
    - Valor (v): Número decimal com ponto (Ex: 0.85)
    - Ticker (t): Maiúsculo.
    
    RETORNE APENAS O JSON:
    {
      "assets": [
        {
          "t": "TICKER",
          "s": "Segmento",
          "type": "FII",
          "d": [
            {"ty": "DIVIDENDO", "dc": "2024-01-30", "dp": "2024-02-15", "v": 1.10}
          ]
        }
      ]
    }
  `;

  try {
    // Utilizando estritamente o modelo gemini-2.5-flash conforme solicitado
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const rawText = response.text || "";
    const parsed = cleanAndParseJSON(rawText);
    
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks as any[];
    
    const result: UnifiedMarketData = { 
        dividends: [], 
        metadata: {},
        sources: groundingChunks?.filter(chunk => chunk?.web?.uri).map(chunk => ({
            web: { uri: chunk.web.uri, title: chunk.web.title || 'Referência B3' }
        })) || []
    };

    if (parsed?.assets && Array.isArray(parsed.assets)) {
      parsed.assets.forEach((asset: any) => {
        if (!asset.t) return;
        
        const ticker = asset.t.toUpperCase();
        
        result.metadata[ticker] = { 
          segment: asset.s || "Geral", 
          type: asset.type?.toUpperCase() === 'FII' ? AssetType.FII : AssetType.STOCK 
        };

        if (asset.d && Array.isArray(asset.d)) {
          asset.d.forEach((div: any) => {
            const rate = parseFloat(String(div.v).replace(',', '.'));
            if (!div.dc || isNaN(rate)) return;
            
            const divId = `g25-${ticker}-${div.dc}-${rate}`.replace(/[^a-zA-Z0-9]/g, '');
            
            result.dividends.push({
              id: divId,
              ticker,
              type: div.ty || "PROVENTO",
              dateCom: div.dc,
              paymentDate: div.dp || div.dc,
              rate: rate,
              quantityOwned: 0,
              totalReceived: 0,
              assetType: asset.type?.toUpperCase() === 'FII' ? AssetType.FII : AssetType.STOCK
            });
          });
        }
      });
    }

    console.log(`[Gemini 2.5 Flash] Sincronização concluída com ${result.dividends.length} registros.`);
    return result;
  } catch (error) {
    console.error("Erro na integração com Gemini 2.5 Flash:", error);
    throw error;
  }
};
