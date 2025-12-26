
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

  // Prompt otimizado para AGRUPAR informações.
  // Solicita explicitamente que a busca seja feita para CADA item e que o retorno cubra as três necessidades:
  // 1. Setor (para gráfico de alocação)
  // 2. Tipo (para separar FII de Ação)
  // 3. Dividendos (para cálculo de inflação e histórico)
  const prompt = `
    Realize uma pesquisa detalhada para CADA UM dos seguintes ativos financeiros brasileiros: ${tickers.join(', ')}.
    
    Para cada ativo, você DEVE encontrar e retornar:
    1. "s": O Segmento/Setor de atuação (ex: Logística, Bancos, Energia). Se não encontrar, deduza pelo nome da empresa.
    2. "type": A classificação exata: "FII" (Fundos Imobiliários) ou "ACAO" (Ações).
    3. "d": A lista COMPLETA de todos os proventos (Dividendos e JCP) que tiveram 'Data Com' (data de corte) nos últimos 12 meses.
    
    REGRAS CRÍTICAS:
    - Não omita nenhum ativo da lista solicitada.
    - Se um ativo não pagou dividendos, retorne a lista "d" vazia, mas PREENCHA "s" e "type".
    - Data formato: YYYY-MM-DD.
    - Valores numéricos: use ponto para decimal (ex: 1.50).
    
    Retorne APENAS um JSON válido com esta estrutura:
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
  `;

  try {
    // Utilizando gemini-3-flash-preview que possui melhor raciocínio para seguir instruções complexas de agrupamento e busca.
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
            web: { uri: chunk.web.uri, title: chunk.web.title || 'Fonte Verificada' }
        })) || []
    };

    if (parsed?.assets && Array.isArray(parsed.assets)) {
      parsed.assets.forEach((asset: any) => {
        const ticker = asset.t?.toUpperCase();
        if (!ticker) return;

        // Normalização do tipo para garantir que o Portfolio agrupe corretamente
        let assetType = AssetType.STOCK;
        const rawType = asset.type?.toUpperCase() || '';
        if (rawType.includes('FII') || rawType.includes('FUNDO')) {
            assetType = AssetType.FII;
        }

        result.metadata[ticker] = { 
          segment: asset.s || "Outros", 
          type: assetType 
        };

        if (asset.d && Array.isArray(asset.d)) {
          asset.d.forEach((div: any) => {
            const val = parseFloat(String(div.v).replace(',', '.'));
            // Validação estrita: Data Com (dc) é obrigatória para vincular à carteira
            if (!div.dc || isNaN(val)) return;
            
            result.dividends.push({
              id: `g3-${ticker}-${div.dc}-${val}`, // ID único baseado na data com
              ticker,
              type: div.ty || "PROVENTO",
              dateCom: div.dc,
              paymentDate: div.dp || div.dc,
              rate: val,
              quantityOwned: 0,
              totalReceived: 0,
              assetType: assetType
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
