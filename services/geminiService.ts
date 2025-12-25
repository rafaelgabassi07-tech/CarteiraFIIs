import { AssetPosition, PortfolioSummary } from "../types";
import { GoogleGenAI } from "@google/genai";

export const analyzePortfolio = async (
  portfolio: AssetPosition[], 
  summary: PortfolioSummary
): Promise<string> => {
  console.log("🚀 [GeminiService] Iniciando serviço de análise...");

  try {
    const apiKey = process.env.API_KEY;
    
    // Debug: Verifica se a chave existe (mostra apenas os primeiros caracteres por segurança)
    if (!apiKey) {
      console.error("❌ [GeminiService] Erro: API_KEY não encontrada no environment.");
      return "Erro: API Key do Google não configurada. Verifique o arquivo .env ou vite.config.ts.";
    } else {
      console.log(`🔑 [GeminiService] API Key detectada: ${apiKey.substring(0, 4)}...`);
    }

    // Prepara os dados
    const assetsDetail = portfolio.map(p => ({
      ticker: p.ticker,
      tipo: p.assetType,
      qtd: p.quantity,
      precoMedio: p.averagePrice.toFixed(2),
      totalPago: (p.averagePrice * p.quantity).toFixed(2),
      dividendosRecebidos: p.totalDividends ? p.totalDividends.toFixed(2) : '0.00',
      yieldOnCost: p.totalDividends && p.averagePrice > 0 
        ? ((p.totalDividends / (p.averagePrice * p.quantity)) * 100).toFixed(2) + '%' 
        : '0%'
    }));

    console.log("📦 [GeminiService] Payload enviado para IA:", { summary, assetsDetail });

    // Prompt focado em Proventos e Saúde da Carteira
    const prompt = `
    Atue como um analista de investimentos sênior especializado no mercado brasileiro (FIIs e Ações).
    
    RESUMO DA CARTEIRA:
    - Patrimônio Atual: R$ ${summary.currentBalance.toFixed(2)}
    - Total Investido (Custo): R$ ${summary.totalInvested.toFixed(2)}
    - Rentabilidade de Capital: ${summary.profitability.toFixed(2)}%
    - TOTAL PROVENTOS (Dividendos/JCP) ACUMULADOS: R$ ${summary.totalDividends.toFixed(2)}
    
    DETALHE DOS ATIVOS (JSON):
    ${JSON.stringify(assetsDetail)}

    SUA MISSÃO:
    Analise especificamente a capacidade de geração de renda passiva (Proventos) desta carteira.
    Responda em Markdown, curto e direto (máximo 4 tópicos):

    1. **Análise de Proventos**: O valor total recebido (R$ ${summary.totalDividends.toFixed(2)}) é saudável proporcionalmente ao investido? Comente sobre o Yield on Cost dos principais ativos.
    2. **Diversificação de Renda**: A renda vem mais de FIIs ou Ações? Isso está equilibrado?
    3. **Ponto de Atenção**: Existe algum ativo que não pagou nada ou pagou muito pouco em relação ao investido?
    4. **Veredito**: Uma frase final de encorajamento ou cautela sobre a estratégia de dividendos.

    Use emojis para deixar a leitura fluida. Não invente dados. Se o dividendo for zero, diga que a carteira ainda está em fase de acumulação inicial.
    `;

    const ai = new GoogleGenAI({ apiKey });

    console.log("⏳ [GeminiService] Aguardando resposta da IA...");
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    console.log("✅ [GeminiService] Resposta recebida com sucesso.");
    return response.text || "A IA retornou uma resposta vazia. Tente novamente.";

  } catch (error: any) {
    console.error("❌ [GeminiService] Erro CRÍTICO na requisição:", error);
    
    if (error.message?.includes('401') || error.message?.includes('API key')) {
      return "Erro de Autenticação: Sua API Key é inválida ou expirou.";
    }
    if (error.message?.includes('429')) {
      return "Erro de Cota: Você atingiu o limite de requisições do Gemini. Tente mais tarde.";
    }
    
    return `Ocorreu um erro técnico: ${error.message}`;
  }
};