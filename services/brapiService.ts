import { BrapiQuote } from '../types';

const BRAPI_TOKEN = (import.meta as any).env?.VITE_BRAPI_TOKEN || process.env.BRAPI_TOKEN;

/**
 * Busca cotações de ativos na API da Brapi.
 * Otimizado para Batch Mode (Busca múltiplos ativos em uma única requisição).
 */
export const getQuotes = async (tickers: string[]): Promise<{ quotes: BrapiQuote[], error?: string }> => {
  if (!tickers || tickers.length === 0) {
    return { quotes: [] };
  }
  
  if (!BRAPI_TOKEN) {
    return { quotes: [], error: "Brapi token missing" };
  }

  const uniqueTickers = Array.from(new Set(tickers.map(t => t.trim().toUpperCase())));
  
  try {
    // Brapi permite até 20 tickers por requisição separados por vírgula no path
    // Vamos dividir em chunks de 20 para segurança máxima
    const chunks = [];
    for (let i = 0; i < uniqueTickers.length; i += 20) {
      chunks.push(uniqueTickers.slice(i, i + 20));
    }

    const allQuotes: BrapiQuote[] = [];

    for (const chunk of chunks) {
      const tickerString = chunk.join(',');
      const url = `https://brapi.dev/api/quote/${tickerString}?token=${BRAPI_TOKEN}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.results) {
          allQuotes.push(...data.results);
        }
      }
    }
    
    return { quotes: allQuotes };
  } catch (e: any) {
    console.error("Brapi Batch Service Error:", e);
    return { quotes: [], error: "Erro ao carregar cotações" };
  }
};
