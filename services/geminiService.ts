import { GoogleGenAI, Type } from "@google/genai";
import { DividendReceipt } from "../types";

// Inicializa o cliente Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const fetchDividendsViaGemini = async (tickers: string[]): Promise<DividendReceipt[]> => {
  if (!tickers.length) return [];

  const prompt = `
    Atue como um analista de dados financeiros da B3 (Brasil).
    
    OBJETIVO:
    Pesquise e liste os proventos (Dividendos, JCP, Rendimentos) PAGOS ou ANUNCIADOS (Data Com definida) nos últimos 24 meses para os ativos: ${tickers.join(', ')}.
    
    REGRAS RÍGIDAS:
    1. **Valor Unitário**: O campo 'rate' DEVE ser o valor pago por UMA ÚNICA COTA/AÇÃO (ex: 0.12). NUNCA retorne o montante total recebido pelo usuário.
    2. **Datas**: Use formato ISO estrito (YYYY-MM-DD). Se não houver dia exato, use o último dia do mês provável.
    3. **Precisão**: Use o Google Search para validar os dados em fontes como RI das empresas, ClubeFII ou StatusInvest.
    4. **Omissão**: Se não encontrar dados confiáveis para um ativo, NÃO invente. Apenas omita do array.
    
    SAÍDA:
    Apenas um JSON Array.
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
              type: { type: Type.STRING, description: "Tipo: DIVIDENDO, JCP ou RENDIMENTO" },
              dateCom: { type: Type.STRING, description: "Data Com (YYYY-MM-DD)" },
              paymentDate: { type: Type.STRING, description: "Data Pagamento (YYYY-MM-DD)" },
              rate: { type: Type.NUMBER, description: "Valor unitário por cota (R$)" }
            },
            required: ["ticker", "dateCom", "rate"]
          }
        }
      }
    });

    let rawData = response.text || "";
    
    // LIMPEZA ROBUSTA: Remove markdown de código se existir
    rawData = rawData.replace(/```json/g, '').replace(/```/g, '').trim();

    const firstBracket = rawData.indexOf('[');
    const lastBracket = rawData.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1) {
        rawData = rawData.substring(firstBracket, lastBracket + 1);
    }

    if (!rawData) return [];

    const parsedData = JSON.parse(rawData);
    
    return parsedData.map((item: any) => ({
      id: `${item.ticker}-${item.dateCom}-${item.rate}-${Math.random().toString(36).substr(2, 5)}`,
      ticker: item.ticker.toUpperCase(),
      type: item.type ? item.type.toUpperCase() : 'PROVENTO',
      dateCom: item.dateCom,
      paymentDate: item.paymentDate || item.dateCom,
      rate: Number(item.rate),
      quantityOwned: 0, 
      totalReceived: 0
    }));

  } catch (error: any) {
    if (error?.message?.includes('429') || error?.status === 429 || error?.code === 429) {
        console.warn("Gemini: Cota excedida (429).");
        throw new Error("COTA_EXCEDIDA");
    }

    console.error("Erro crítico ao buscar dividendos via Gemini:", error);
    return [];
  }
};