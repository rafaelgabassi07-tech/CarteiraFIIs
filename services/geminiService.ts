import { AssetPosition, PortfolioSummary } from "../types";
import { GoogleGenAI } from "@google/genai";

export const analyzePortfolio = async (
  portfolio: AssetPosition[], 
  summary: PortfolioSummary
): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
      return "Erro: API Key do Google não configurada. Adicione sua chave no arquivo .env ou nas variáveis de ambiente.";
    }

    // Prepara um resumo simplificado dos ativos para economizar tokens, mas mantendo o essencial
    const assetsDetail = portfolio.map(p => ({
      t: p.ticker, // Ticker
      tp: p.assetType, // Tipo
      q: p.quantity, // Quantidade
      pm: p.averagePrice.toFixed(2), // Preço Médio
      pa: p.currentPrice?.toFixed(2) || 'N/A', // Preço Atual
      dy: p.totalDividends ? (p.totalDividends / (p.averagePrice * p.quantity) * 100).toFixed(2) + '%' : '0%' // Yield on Cost aproximado
    }));

    // Prompt único englobando todo o contexto
    const prompt = `
    Você é um consultor financeiro especialista em Brasil (FIIs e Ações).
    
    DADOS DA CARTEIRA:
    - Patrimônio Total: R$ ${summary.currentBalance.toFixed(2)}
    - Custo de Aquisição: R$ ${summary.totalInvested.toFixed(2)}
    - Resultado (R$): R$ ${(summary.currentBalance - summary.totalInvested).toFixed(2)}
    - Rentabilidade: ${summary.profitability.toFixed(2)}%
    - Total Proventos Recebidos: R$ ${summary.totalDividends.toFixed(2)}
    
    ATIVOS (JSON Simplificado):
    ${JSON.stringify(assetsDetail)}

    TAREFA:
    Faça uma análise concisa (máximo 4 parágrafos curtos) em Markdown.
    1. **Diagnóstico**: Comente a saúde geral da carteira com base na rentabilidade e proventos.
    2. **Diversificação**: Analise o balanço entre FIIs e Ações.
    3. **Atenção**: Cite 1 ou 2 ativos que requerem atenção (se houver, baseado em queda ou risco).
    4. **Recomendação**: Dê uma sugestão prática de próximo passo (ex: rebalancear, reinvestir, aguardar).

    Seja direto, profissional e encorajador. Use emojis moderadamente.
    `;

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    return response.text || "A IA não retornou uma análise válida. Tente novamente.";

  } catch (error) {
    console.error("Erro ao analisar carteira com IA:", error);
    return "Ocorreu um erro na comunicação com a IA. Verifique sua conexão e chave de API.";
  }
};