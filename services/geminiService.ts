import { AssetPosition } from "../types";
import { GoogleGenAI } from "@google/genai";

export const analyzePortfolio = async (portfolio: AssetPosition[]): Promise<string> => {
  try {
    // 1. Verificar API Key (Vite substitui process.env.API_KEY pela string definida)
    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
      return "Erro: API Key do Google não configurada no ambiente.";
    }

    // 2. Preparar os dados para a IA (simplificados para economizar tokens e focar no essencial)
    const portfolioSummary = portfolio.map(p => ({
      ticker: p.ticker,
      tipo: p.assetType,
      qtd: p.quantity,
      valor_total: (p.currentPrice || p.averagePrice) * p.quantity,
      lucro_prejuizo_perc: p.currentPrice 
        ? ((p.currentPrice - p.averagePrice) / p.averagePrice * 100).toFixed(2) + '%' 
        : 'N/A'
    }));

    const totalValue = portfolio.reduce((acc, curr) => acc + ((curr.currentPrice || curr.averagePrice) * curr.quantity), 0);

    const prompt = `
    Atue como um analista de investimentos sênior especializado no mercado brasileiro (FIIs e Ações).
    Analise a seguinte carteira de investimentos (Valor Total: R$ ${totalValue.toFixed(2)}):
    
    ${JSON.stringify(portfolioSummary, null, 2)}

    Forneça uma análise concisa e direta em formato Markdown (sem introduções longas):
    1. **Diversificação**: Avalie a distribuição entre FIIs e Ações.
    2. **Risco**: Identifique possíveis concentrações ou ativos de alto risco se houver.
    3. **Sugestões**: Dê 3 dicas curtas e acionáveis para melhorar a carteira.

    Mantenha o tom profissional e educativo.
    `;

    // 3. Inicializar Cliente
    const ai = new GoogleGenAI({ apiKey });

    // 4. Gerar Conteúdo
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 } // Desativa thinking para resposta mais rápida e direta
      }
    });

    return response.text || "Não foi possível gerar a análise no momento.";

  } catch (error) {
    console.error("Erro ao analisar carteira com IA:", error);
    return "Ocorreu um erro ao tentar analisar sua carteira. Verifique sua conexão ou tente novamente mais tarde.";
  }
};