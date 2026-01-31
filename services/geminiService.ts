
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Gera uma análise financeira comparando o desempenho da carteira com a inflação (IPCA).
 */
export const generateInflationAnalysis = async (
  inflationRate: number,
  portfolioYield12m: number,
  realYield: number,
  coverageRatio: number
): Promise<string> => {
  try {
    const prompt = `
      Atue como um assistente financeiro pessoal chamado "InvestBot".
      O usuário quer saber se está ganhando da inflação brasileira (IPCA).
      
      DADOS DO MERCADO E CARTEIRA:
      - IPCA Acumulado (12 meses): ${inflationRate.toFixed(2)}%
      - Dividend Yield da Carteira (12 meses): ${portfolioYield12m.toFixed(2)}%
      - Ganho Real (Spread): ${realYield.toFixed(2)}%
      - Cobertura de Custo de Vida (Renda vs Custo Inflação): ${coverageRatio.toFixed(0)}%

      TAREFA:
      Forneça um diagnóstico curto (máximo 30 palavras) e direto.
      Analise se o investidor está preservando poder de compra.
      Se o ganho real for positivo, seja otimista e parabenize.
      Se for negativo, alerte com cuidado sobre a corrosão do patrimônio.
      Use 1 ou 2 emojis financeiros.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text?.trim() || "Não consegui processar os dados do Banco Central no momento.";
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return "Minha conexão com o Banco Central instável. Tente novamente em instantes.";
  }
};

/**
 * Prevê o calendário de proventos com base em padrões históricos conhecidos pelo modelo.
 */
export const predictDividendSchedule = async (tickers: string[]): Promise<any[]> => {
  try {
    const prompt = `
      Analise os seguintes ativos listados na B3 (Brasil): ${tickers.join(', ')}.
      Com base no histórico de pagamentos destes ativos, estime a PROVÁVEL próxima 'Data Com' (data de corte) e 'Data de Pagamento' para cada um, considerando a data atual: ${new Date().toLocaleDateString('pt-BR')}.
      
      Regras:
      1. Se o ativo paga mensalmente (ex: maioria dos FIIs), projete para o mês atual ou próximo.
      2. Se paga trimestralmente (ex: VALE3, PETR4), projete o próximo ciclo.
      3. Defina um nível de confiança (ALTA, MEDIA, BAIXA).
      4. Retorne APENAS JSON.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              ticker: { type: Type.STRING },
              predictedDateCom: { type: Type.STRING, description: "Formato YYYY-MM-DD" },
              predictedPaymentDate: { type: Type.STRING, description: "Formato YYYY-MM-DD" },
              confidence: { type: Type.STRING, enum: ["ALTA", "MEDIA", "BAIXA"] },
              reasoning: { type: Type.STRING, description: "Breve motivo da previsão (ex: 'Padrão mensal dia 10')" }
            },
            required: ["ticker", "predictedDateCom", "predictedPaymentDate", "confidence"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Prediction Error:", error);
    return [];
  }
};
