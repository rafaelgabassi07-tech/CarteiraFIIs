
import { BrapiQuote } from '../types';

// Função segura para obter o Token
const getBrapiToken = () => {
    try {
        if (typeof process !== 'undefined' && process.env && process.env.BRAPI_TOKEN) {
            return process.env.BRAPI_TOKEN;
        }
        if ((import.meta as any).env?.VITE_BRAPI_TOKEN) {
            return (import.meta as any).env.VITE_BRAPI_TOKEN;
        }
    } catch {
        return undefined;
    }
    return undefined;
};

const BRAPI_TOKEN = getBrapiToken();

/**
 * Busca cotações de ativos na API da Brapi.
 * Lógica: Requisições individuais em paralelo (Promise.all) para evitar que erro em um ticker trave o lote todo.
 * Mantém cache: 'no-store' para garantir dados frescos.
 */
export const getQuotes = async (tickers: string[]): Promise<{ quotes: BrapiQuote[], error?: string }> => {
  if (!tickers || tickers.length === 0) {
    return { quotes: [] };
  }
  
  if (!BRAPI_TOKEN) {
    console.warn("Brapi token missing. Verifique suas variáveis de ambiente (VITE_BRAPI_TOKEN).");
    return { quotes: [], error: "Token de cotação não configurado" };
  }

  // Remove duplicatas e limpa espaços
  const uniqueTickers = Array.from(new Set(tickers.map(t => t.trim().toUpperCase())));
  
  try {
    const quotePromises = uniqueTickers.map(async (ticker) => {
        try {
            const response = await fetch(`https://brapi.dev/api/quote/${ticker}?token=${BRAPI_TOKEN}`, {
                cache: 'no-store'
            });
            
            if (!response.ok) {
                if (response.status !== 404) {
                    console.warn(`Brapi error for ${ticker}: ${response.status}`);
                }
                return null;
            }

            const data = await response.json();
            
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
