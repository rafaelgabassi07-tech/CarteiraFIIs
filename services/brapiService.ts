import { BrapiQuote } from '../types';

// A chave de API agora é lida do ambiente do Vite, seguindo o padrão VITE_.
const BRAPI_TOKEN = import.meta.env.VITE_BRAPI_TOKEN;

/**
 * Busca cotações de ativos da API da Brapi fazendo requisições individuais por ativo.
 * @param tickers - Array de tickers para buscar.
 * @returns Um objeto com as cotações e um possível erro.
 */
export const getQuotes = async (tickers: string[]): Promise<{ quotes: BrapiQuote[], error?: string }> => {
  if (!tickers || tickers.length === 0) {
    return { quotes: [] };
  }
  if (!BRAPI_TOKEN) {
    const errorMsg = "Chave da API Brapi (VITE_BRAPI_TOKEN) não configurada.";
    console.error(errorMsg);
    return { quotes: [], error: errorMsg };
  }

  const uniqueTickers = Array.from(new Set(tickers.map(t => t.trim().toUpperCase())));

  // Cria um array de promises de fetch, uma para cada ticker.
  const promises = uniqueTickers.map(ticker => {
    const url = `https://brapi.dev/api/quote/${ticker}?token=${BRAPI_TOKEN}&range=1d&interval=1d`;
    return fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`API Brapi respondeu com status ${response.status} para ${ticker}`);
        }
        return response.json();
      })
      .then(data => {
        if (data.error) {
          throw new Error(`Erro da API Brapi para ${ticker}: ${data.error}`);
        }
        // A estrutura para um único ticker é { "results": [{...}] }
        return data.results && data.results[0] ? data.results[0] : null;
      });
  });

  // Utiliza Promise.allSettled para aguardar todas as requisições, mesmo que algumas falhem.
  const results = await Promise.allSettled(promises);

  const successfulQuotes: BrapiQuote[] = [];
  let hasErrors = false;

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value) {
      successfulQuotes.push(result.value);
    } else if (result.status === 'rejected') {
      hasErrors = true;
      console.error(`Erro ao buscar cotação para ${uniqueTickers[index]}:`, result.reason?.message);
    }
  });

  return { 
    quotes: successfulQuotes, 
    error: hasErrors ? "Algumas cotações não puderam ser carregadas." : undefined 
  };
};