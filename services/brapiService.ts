
import { BrapiQuote } from '../types';

const BRAPI_TOKEN = (import.meta as any).env?.VITE_BRAPI_TOKEN || process.env.BRAPI_TOKEN;

/**
 * Busca cotações de ativos na API da Brapi.
 * Lógica: Requisições individuais em paralelo (Promise.all) para evitar que erro em um ticker trave o lote todo.
 */
export const getQuotes = async (tickers: string[]): Promise<{ quotes: BrapiQuote[], error?: string }> => {
  if (!tickers || tickers.length === 0) {
    return { quotes: [] };
  }
  
  if (!BRAPI_TOKEN) {
    return { quotes: [], error: "Brapi token missing" };
  }

  // Remove duplicatas e limpa espaços
  const uniqueTickers = Array.from(new Set(tickers.map(t => t.trim().toUpperCase())));
  
  try {
    const quotePromises = uniqueTickers.map(async (ticker) => {
        try {
            const response = await fetch(`https://brapi.dev/api/quote/${ticker}?token=${BRAPI_TOKEN}`);
            
            if (!response.ok) {
                console.warn(`Brapi error for ${ticker}: ${response.status}`);
                return null;
            }

            const data = await response.json();
            
            // Brapi retorna { results: [...] }
            if (data.results && Array.isArray(data.results) && data.results.length > 0) {
                return data.results[0] as BrapiQuote;
            }
            return null;
        } catch (innerError) {
            console.warn(`Falha na requisição individual para ${ticker}`, innerError);
            return null;
        }
    });

    const results = await Promise.all(quotePromises);
    const validQuotes = results.filter((q): q is BrapiQuote => q !== null);

    return { quotes: validQuotes };

  } catch (e: any) {
    console.error("Brapi Service Error:", e);
    return { quotes: [], error: "Erro ao processar fila de cotações" };
  }
};
