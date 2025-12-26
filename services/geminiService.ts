
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

  // Inicializa o SDK usando a API_KEY do ambiente injetada automaticamente
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Como um analista de investimentos especializado na B3, use a ferramenta de busca para encontrar os dados mais recentes dos ativos: ${tickers.join(', ')}.
    
    PARA CADA ATIVO:
    1. Identifique o tipo: FII ou ACAO (Ação).
    2. Identifique o setor ou segmento (ex: Shoppings, Bancos, Logística).
    3. Liste TODOS os dividendos ou JCP anunciados (futuros) ou pagos nos últimos 12 meses.
    
    REGRAS DE FORMATAÇÃO (OBRIGATÓRIO):
    - Data Com (dc): YYYY-MM-DD
    - Data Pagamento (dp): YYYY-MM-DD
    - Valor (v): Número decimal puro (ex: 0.12, use ponto como separador decimal).
    - Ticker (t): Em caixa alta.
    
    RETORNE APENAS O JSON NO FORMATO ABAIXO, SEM TEXTO ADICIONAL:
    {
      "assets": [
        {
          "t": "TICKER",
          "s": "Segmento",
          "type": "FII",
          "d": [
            {"ty": "DIVIDENDO", "dc": "2024-05-30", "dp": "2024-06-15", "v": 1.25}
          ]
        }
      ]
    }
  `;

  try {
    // Gemini 3 Flash Preview é recomendado para tarefas de texto/busca com baixa latência
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", 
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
            web: { uri: chunk.web.uri, title: chunk.web.title || 'Fonte de Mercado' }
        })) || []
    };

    if (parsed?.assets && Array.isArray(parsed.assets)) {
      parsed.assets.forEach((asset: any) => {
        if (!asset.t) return;
        
        const ticker = asset.t.toUpperCase();
        
        // Mapeamento de Metadados
        result.metadata[ticker] = { 
          segment: asset.s || "Geral", 
          type: asset.type?.toUpperCase() === 'FII' ? AssetType.FII : AssetType.STOCK 
        };

        // Processamento de Dividendos
        if (asset.d && Array.isArray(asset.d)) {
          asset.d.forEach((div: any) => {
            // Validação mínima dos dados
            const rate = parseFloat(String(div.v).replace(',', '.'));
            if (!div.dc || isNaN(rate)) return;
            
            // ID único para evitar duplicatas no cache do app
            const divId = `gemini-${ticker}-${div.dc}-${rate}`.replace(/[^a-zA-Z0-9]/g, '');
            
            result.dividends.push({
              id: divId,
              ticker,
              type: div.ty || "PROVENTO",
              dateCom: div.dc,
              paymentDate: div.dp || div.dc, // Fallback para data com se pagamento não existir
              rate: rate,
              quantityOwned: 0, // Calculado no App.tsx
              totalReceived: 0, // Calculado no App.tsx
              assetType: asset.type?.toUpperCase() === 'FII' ? AssetType.FII : AssetType.STOCK
            });
          });
        }
      });
    }

    console.log(`[Gemini] Sync finalizado. ${result.dividends.length} proventos processados.`);
    return result;
  } catch (error) {
    console.error("Erro crítico ao sincronizar com Gemini:", error);
    throw error;
  }
};
