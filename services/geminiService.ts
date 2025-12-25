import { GoogleGenAI, Type } from "@google/genai";
import { DividendReceipt } from "../types";

// Inicializa o cliente Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const fetchDividendsViaGemini = async (tickers: string[]): Promise<DividendReceipt[]> => {
  if (!tickers.length) return [];

  const prompt = `
    Você é um assistente financeiro especializado em FIIs e Ações Brasileiras.
    
    Ação necessária:
    Pesquise na internet (Google Search) pelos últimos dividendos pagos e anúncios de proventos futuros (Data Com, Data Pagamento, Valor) para os seguintes ativos: ${tickers.join(', ')}.
    
    Regras:
    1. Considere os últimos 3 pagamentos realizados e quaisquer pagamentos futuros anunciados.
    2. Data Com: A data limite para ter o ativo.
    3. Retorne APENAS um JSON seguindo estritamente o schema fornecido.
    4. Se não encontrar dados recentes (últimos 3 meses) para algum ativo, ignore-o.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              ticker: { type: Type.STRING },
              type: { type: Type.STRING, description: "DIVIDENDO, JCP ou RENDIMENTO" },
              dateCom: { type: Type.STRING, description: "Formato YYYY-MM-DD" },
              paymentDate: { type: Type.STRING, description: "Formato YYYY-MM-DD" },
              rate: { type: Type.NUMBER, description: "Valor por cota/ação em reais" }
            },
            required: ["ticker", "dateCom", "paymentDate", "rate"]
          }
        }
      }
    });

    const rawData = response.text;
    if (!rawData) return [];

    const parsedData = JSON.parse(rawData);
    
    // Mapeia para o formato interno, adicionando campos que faltam para o DividendReceipt
    // Nota: quantityOwned e totalReceived serão calculados no App.tsx cruzando com a carteira
    return parsedData.map((item: any) => ({
      id: `${item.ticker}-${item.dateCom}-${Math.random().toString(36).substr(2, 9)}`,
      ticker: item.ticker.toUpperCase(),
      type: item.type || 'PROVENTO',
      dateCom: item.dateCom,
      paymentDate: item.paymentDate,
      rate: Number(item.rate),
      quantityOwned: 0, // Será preenchido pelo App
      totalReceived: 0  // Será preenchido pelo App
    }));

  } catch (error) {
    console.error("Erro ao buscar dividendos via Gemini:", error);
    return [];
  }
};