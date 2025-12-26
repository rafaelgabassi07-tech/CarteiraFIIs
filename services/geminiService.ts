
import { GoogleGenAI } from "@google/genai";
import { DividendReceipt, AssetType } from "../types";

export interface UnifiedMarketData {
  dividends: DividendReceipt[];
  metadata: Record<string, { segment: string; type: AssetType }>;
  sources?: { web: { uri: string; title: string } }[];
}

const GEMINI_CACHE_KEY = 'investfiis_gemini_internal_cache';

function cleanAndParseJSON(text: string): any {
  try {
    let cleaned = text.trim();
    // Remove blocos de markdown ```json ... ```
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(json)?/, '').replace(/```$/, '');
    }
    // Remove caracteres invisíveis ou whitespace extra nas pontas
    cleaned = cleaned.trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Erro ao fazer parse do JSON Gemini:", e);
    return null;
  }
}

export const fetchUnifiedMarketData = async (tickers: string[]): Promise<UnifiedMarketData> => {
  // Verificação de segurança: não faz requisição se lista vazia
  if (!tickers || tickers.length === 0) return { dividends: [], metadata: {} };

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Confirmação: Estamos enviando TODOS os tickers em UMA única string no prompt.
  // Isso garante que é apenas 1 requisição API (Batch), evitando 429 por volume.
  const tickerListString = tickers.join(', ');

  const prompt = `
    Atue como um Especialista em Dados de Mercado da B3 (Brasil).
    
    Sua missão é consultar fontes oficiais recentes (últimos 12 meses) para a lista de ativos abaixo e retornar um ÚNICO JSON consolidado.
    
    LISTA DE ATIVOS: ${tickerListString} (${tickers.length} ativos no total).
    
    PARA CADA ATIVO DA LISTA, VOCÊ DEVE:
    1. Classificar o Tipo (FII ou ACAO) e o Setor/Segmento de atuação.
    2. Listar TODOS os proventos (Dividendos/JCP) com "Data Com" (Data de corte) nos últimos 12 meses.
    
    IMPORTANTE:
    - O foco é a precisão das datas (Data Com e Data Pagamento).
    - RETORNE APENAS O JSON FINAL, SEM EXPLICAÇÕES OU MARKDOWN.
    - AS DATAS DEVEM ESTAR NO FORMATO ESTRITO YYYY-MM-DD (ISO 8601).
    
    REGRAS DE DADOS:
    - Data Com (dc): A data limite para ter o ativo na carteira. Formato YYYY-MM-DD.
    - Data Pagamento (dp): Quando o dinheiro cai na conta. Formato YYYY-MM-DD.
    - Valor (v): Valor bruto por cota/ação.
    - Tipo (ty): "DIVIDENDO" ou "JCP".
    
    SAÍDA ESPERADA (JSON):
    {
      "assets": [
        {
          "t": "TICKER",
          "s": "Logística",
          "type": "FII",
          "d": [
            {"ty": "DIVIDENDO", "dc": "2024-01-30", "dp": "2024-02-14", "v": 0.10}
          ]
        },
        ... (repita para todos os ativos)
      ]
    }
  `;

  try {
    // SINGLE REQUEST: Chamada única com todos os dados.
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }] // Ferramenta de busca ativada
      }
    });

    if (!response.text) {
        throw new Error("Resposta vazia do Gemini");
    }

    const parsed = cleanAndParseJSON(response.text);
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks as any[];
    
    const result: UnifiedMarketData = { 
        dividends: [], 
        metadata: {},
        sources: groundingChunks?.filter(chunk => chunk?.web?.uri) || []
    };

    if (parsed?.assets && Array.isArray(parsed.assets)) {
      parsed.assets.forEach((asset: any) => {
        const ticker = asset.t?.toUpperCase();
        if (!ticker) return;

        result.metadata[ticker] = { 
          segment: asset.s || "Geral", 
          type: asset.type?.toUpperCase() === 'FII' ? AssetType.FII : AssetType.STOCK 
        };

        if (Array.isArray(asset.d)) {
            asset.d.forEach((div: any) => {
            const divId = `${ticker}-${div.dc}-${div.v}`.replace(/[^a-zA-Z0-9]/g, '');
            result.dividends.push({
                id: divId,
                ticker,
                type: div.ty || "PROVENTO",
                dateCom: div.dc,
                paymentDate: div.dp || div.dc,
                rate: typeof div.v === 'number' ? div.v : parseFloat(div.v),
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
        console.warn("Gemini Rate Limit (429) atingido. Tente novamente em instantes.");
    }
    console.error("Gemini Market Data Sync Error:", error);
    throw error;
  }
};
