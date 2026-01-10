
import { BrapiQuote } from '../types';

const BRAPI_TOKEN = (import.meta as any).env?.VITE_BRAPI_TOKEN || process.env.BRAPI_TOKEN;

/**
 * Busca cotações de ativos na API da Brapi.
 * Configurado para requisições individuais por ativo (Ativo por Ativo).
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
    const allQuotes: BrapiQuote[] = [];

    // Mapeia cada ticker para uma promessa de busca individual
    const quotePromises = uniqueTickers.map(async (ticker) => {
      try {
        const url = `https://brapi.dev/api/quote/${ticker}?token=${BRAPI_TOKEN}`;
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          // A API retorna um array 'results' mesmo para consultas individuais
          if (data.results && data.results.length > 0) {
            return data.results[0] as BrapiQuote;
          }
        }
        return null;
      } catch (err) {
        console.warn(`Erro ao buscar cotação individual para ${ticker}:`, err);
        return null;
      }
    });

    // Aguarda todas as requisições individuais serem concluídas
    const results = await Promise.all(quotePromises);

    // Filtra apenas os resultados que retornaram dados válidos
    results.forEach(quote => {
      if (quote) {
        allQuotes.push(quote);
      }
    });
    
    return { quotes: allQuotes };
  } catch (e: any) {
    console.error("Brapi Service Global Error:", e);
    return { quotes: [], error: "Erro crítico ao carregar cotações" };
  }
};
