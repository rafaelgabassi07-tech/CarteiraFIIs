import { BrapiQuote } from '../types';

// A chave de API agora é lida do ambiente do Vite, injetado no momento da compilação.
const BRAPI_TOKEN = process.env.BRAPI_TOKEN;

/**
 * Busca cotações de ativos diretamente da API da Brapi.
 * @param tickers - Array de tickers para buscar.
 * @returns Um objeto com as cotações e um possível erro.
 */
export const getQuotes = async (tickers: string[]): Promise<{ quotes: BrapiQuote[], error?: string }> => {
  if (!tickers || tickers.length === 0) {
    return { quotes: [] };
  }
  if (!BRAPI_TOKEN) {
    const errorMsg = "Chave da API Brapi (BRAPI_TOKEN) não configurada.";
    console.error(errorMsg);
    return { quotes: [], error: errorMsg };
  }

  const uniqueTickers = Array.from(new Set(tickers.map(t => t.trim().toUpperCase())));
  const tickersString = uniqueTickers.join(',');

  try {
    const url = `https://brapi.dev/api/quote/${tickersString}?token=${BRAPI_TOKEN}&range=1d&interval=1d`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`A API da Brapi respondeu com o status ${response.status}`);
    }

    const data = await response.json();
    
    // A API da Brapi pode retornar um objeto de erro dentro de uma resposta 200 OK.
    if (data.error) {
      throw new Error(data.error);
    }
    
    // A estrutura da Brapi para múltiplos tickers é { "results": [...] }
    return { quotes: data.results || [] };

  } catch (e: any) {
    console.error("Erro ao chamar a API da Brapi:", e.message);
    return { quotes: [], error: "Erro de conexão com o servidor de cotações." };
  }
};
