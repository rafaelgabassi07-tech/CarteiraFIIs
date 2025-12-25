import { GoogleGenAI } from "@google/genai";
import { AssetPosition } from "../types";

// Initialize Gemini with the environment variable
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzePortfolio = async (portfolio: AssetPosition[]): Promise<string> => {
  if (portfolio.length === 0) {
    return "Adicione ativos à sua carteira para receber uma análise.";
  }

  const portfolioSummary = portfolio.map(p => 
    `- ${p.ticker} (${p.assetType}): ${p.quantity} cotas/ações a R$ ${p.averagePrice.toFixed(2)} (Preço Atual: R$ ${p.currentPrice?.toFixed(2) || 'N/A'})`
  ).join('\n');

  const prompt = `
    Atue como um analista financeiro sênior especializado no mercado brasileiro (B3).
    Analise a seguinte carteira de investimentos (FIIs e Ações):
    
    ${portfolioSummary}
    
    Forneça 3 insights curtos e diretos (máximo 2 frases cada) sobre:
    1. Diversificação (Setorial/Risco)
    2. Potencial de Renda (Dividendos)
    3. Uma sugestão de atenção (O que monitorar)

    Responda em formato Markdown, usando tópicos. Seja objetivo.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Não foi possível gerar a análise no momento.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Erro ao conectar com a Inteligência Artificial. Verifique sua chave API.";
  }
};