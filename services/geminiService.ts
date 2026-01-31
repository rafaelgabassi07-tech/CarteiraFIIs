
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
 * Prevê o calendário de proventos (JCP, Dividendos, Rendimentos) com base em padrões históricos.
 */
export const predictDividendSchedule = async (tickers: string[]): Promise<any[]> => {
  try {
    const prompt = `
      Atue como um analista de dados da B3 (Brasil).
      Analise os seguintes ativos: ${tickers.join(', ')}.
      Data de Referência (Hoje): ${new Date().toLocaleDateString('pt-BR')}.

      TAREFA:
      Identifique o PRÓXIMO evento de provento PROVÁVEL ou ANUNCIADO (mas ainda não pago) para cada ativo.
      
      REGRAS CRÍTICAS PARA AÇÕES (Stocks):
      1. Diferencie explicitamente entre "DIVIDENDO" (Isento) e "JCP" (Juros sobre Capital Próprio).
      2. Empresas como Bancos (ITUB, BBDC, BBAS, SANB) costumam pagar JCP mensal ou trimestral.
      3. Empresas como PETR4, VALE3 pagam Dividendos trimestrais robustos.
      4. Consulte sua base de conhecimento sobre "Avisos aos Acionistas" recentes ou padrões históricos do mesmo trimestre em anos anteriores.

      REGRAS PARA FIIs:
      1. A maioria paga "RENDIMENTO" mensalmente no meio do mês (dia 10-15).

      SAÍDA (JSON):
      Retorne um array onde 'predictionType' deve ser estritamente: 'DIV', 'JCP' ou 'REND'.
      'confidence' deve ser 'ALTA' se for baseado em anúncio ou padrão muito forte, 'MEDIA' para padrão histórico.
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
              predictionType: { type: Type.STRING, enum: ["DIV", "JCP", "REND"], description: "Tipo exato do provento" },
              confidence: { type: Type.STRING, enum: ["ALTA", "MEDIA", "BAIXA"] },
              reasoning: { type: Type.STRING, description: "Ex: 'JCP Trimestral recorrente' ou 'Anúncio de dividendos'" }
            },
            required: ["ticker", "predictedDateCom", "predictedPaymentDate", "confidence", "predictionType"]
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
