import { GoogleGenAI, Type } from "@google/genai";
import { DividendReceipt } from "../types";

// Inicializa o cliente Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const fetchDividendsViaGemini = async (tickers: string[]): Promise<DividendReceipt[]> => {
  if (!tickers.length) return [];

  const prompt = `
    Você é um analista de dados financeiros especializado em FIIs e Ações da B3 (Brasil).
    
    TAREFA:
    Pesquise na internet (Google Search) os dados de proventos (Dividendos, JCP, Rendimentos) para os seguintes ativos: ${tickers.join(', ')}.
    
    REQUISITOS OBRIGATÓRIOS:
    1. **Passado**: Busque o histórico de pagamentos realizados nos últimos 24 meses (2 anos).
    2. **Futuro**: Busque OBRIGATORIAMENTE por quaisquer anúncios de dividendos futuros ("Data Com" já ocorreu ou vai ocorrer, mas pagamento ainda não realizado).
    3. **Precisão**: Eu preciso da "Data Com" (data limite para ter o ativo), "Data Pagamento" e "Valor Líquido/Bruto".
    
    FORMATO DE RESPOSTA (JSON):
    Retorne APENAS um Array JSON puro. Não use Markdown. Não inclua texto explicativo antes ou depois.
    
    Schema do Objeto:
    {
      "ticker": "string (ex: MXRF11)",
      "type": "string (DIVIDENDO, JCP, RENDIMENTO)",
      "dateCom": "string (formato YYYY-MM-DD)",
      "paymentDate": "string (formato YYYY-MM-DD, se não houver previsão exata, estime com base no histórico ou deixe null)",
      "rate": number (valor em Reais, ex: 0.12)
    }

    Se não encontrar dados para um ativo específico, simplesmente não o inclua na lista.
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
              type: { type: Type.STRING, description: "Tipo do provento" },
              dateCom: { type: Type.STRING, description: "Data de corte YYYY-MM-DD" },
              paymentDate: { type: Type.STRING, description: "Data de pagamento YYYY-MM-DD" },
              rate: { type: Type.NUMBER, description: "Valor unitário" }
            },
            required: ["ticker", "dateCom", "rate"]
          }
        }
      }
    });

    let rawData = response.text || "";
    
    // LIMPEZA ROBUSTA: Remove markdown de código se existir (```json ... ```)
    rawData = rawData.replace(/```json/g, '').replace(/```/g, '').trim();

    // Garante que pegamos apenas o array JSON se houver texto em volta
    const firstBracket = rawData.indexOf('[');
    const lastBracket = rawData.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1) {
        rawData = rawData.substring(firstBracket, lastBracket + 1);
    }

    if (!rawData) return [];

    const parsedData = JSON.parse(rawData);
    
    // Pós-processamento para garantir integridade
    return parsedData.map((item: any) => ({
      id: `${item.ticker}-${item.dateCom}-${item.rate}-${Math.random().toString(36).substr(2, 5)}`,
      ticker: item.ticker.toUpperCase(),
      type: item.type || 'PROVENTO',
      dateCom: item.dateCom,
      paymentDate: item.paymentDate || item.dateCom, // Fallback se data pagamento for nula
      rate: Number(item.rate),
      quantityOwned: 0, // Será calculado no App.tsx
      totalReceived: 0  // Será calculado no App.tsx
    }));

  } catch (error: any) {
    // Tratamento específico para Erro 429 (Cota Excedida)
    if (error?.message?.includes('429') || error?.status === 429 || error?.code === 429) {
        console.warn("Gemini: Cota excedida (429).");
        throw new Error("COTA_EXCEDIDA");
    }

    console.error("Erro crítico ao buscar dividendos via Gemini:", error);
    return [];
  }
};