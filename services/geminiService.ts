
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
 * Prevê o calendário de proventos (JCP, Dividendos, Rendimentos) com base em padrões históricos e fatos relevantes.
 */
export const predictDividendSchedule = async (tickers: string[]): Promise<any[]> => {
  try {
    const prompt = `
      Atue como um analista sênior de Corporate Actions da B3.
      Analise os seguintes ativos: ${tickers.join(', ')}.
      Data de Referência (Hoje): ${new Date().toLocaleDateString('pt-BR')}.

      TAREFA:
      Identifique o PRÓXIMO evento de provento para cada ativo.
      Você deve distinguir se o evento já foi "ANUNCIADO" (Fato Relevante publicado) ou se é "PROJETADO" (Baseado em histórico).

      REGRAS RÍGIDAS:
      1. TIPO: Diferencie "DIVIDENDO" (Isento), "JCP" (Tributado) e "RENDIMENTO" (FIIs).
      2. DATACOM: Se for ANUNCIADO, forneça a data exata. Se PROJETADO, estime com base no ciclo anterior (Trimestral/Mensal).
      3. CONFIBILIDADE: Se houver anúncio oficial recente, confiança é ALTA.
      
      PADRÕES DE MERCADO:
      - FIIs (Final 11): Pagam mensalmente. Datacom costuma ser último dia útil ou ~8º dia útil.
      - Bancos (ITUB, BBDC): JCP Mensal recorrente.
      - Vale/Petrobras: Trimestralidade forte.

      SAÍDA (JSON):
      Retorne um array. 'status' deve ser 'ANUNCIADO' ou 'PROJETADO'.
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
              status: { type: Type.STRING, enum: ["ANUNCIADO", "PROJETADO"], description: "Se é oficial ou estimativa" },
              confidence: { type: Type.STRING, enum: ["ALTA", "MEDIA", "BAIXA"] },
              reasoning: { type: Type.STRING, description: "Ex: 'Fato Relevante de 12/05' ou 'Padrão mensal'" }
            },
            required: ["ticker", "predictedDateCom", "predictedPaymentDate", "confidence", "predictionType", "status"]
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
