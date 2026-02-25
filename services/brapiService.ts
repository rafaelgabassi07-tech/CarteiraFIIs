
import { BrapiQuote } from '../types';

// Função segura para obter o Token com fallback
const getBrapiToken = () => {
    // Tenta via injeção do Vite (Define)
    if (typeof process !== 'undefined' && process.env && process.env.BRAPI_TOKEN) {
        return process.env.BRAPI_TOKEN.replace(/"/g, ''); // Remove aspas extras se houver
    }
    // Tenta via import.meta (Vite nativo)
    if ((import.meta as any).env?.VITE_BRAPI_TOKEN) {
        return (import.meta as any).env.VITE_BRAPI_TOKEN;
    }
    return '';
};

const BRAPI_TOKEN = getBrapiToken();
console.log('[BrapiService] Token Loaded:', BRAPI_TOKEN ? `YES (Length: ${BRAPI_TOKEN.length})` : 'NO');

/**
 * Busca cotações de ativos na API da Brapi.
 * Refatorado para buscar em lote (batch) para evitar rate limiting.
 */
export const getQuotes = async (tickers: string[]): Promise<{ quotes: BrapiQuote[], error?: string }> => {
  if (!tickers || tickers.length === 0) {
    return { quotes: [] };
  }
  
  if (!BRAPI_TOKEN) {
    console.warn("[BrapiService] Token not found. Cotações em tempo real indisponíveis.");
    return { quotes: [], error: "Token não configurado" };
  }

  // Remove duplicatas e junta os tickers com vírgula para busca em lote
  const uniqueTickers = Array.from(new Set(tickers.map(t => t.trim().toUpperCase())));
  const tickersParam = uniqueTickers.join(',');
  
  try {
    // console.log(`[BrapiService] Fetching batch: ${tickersParam}`);
    const response = await fetch(`https://brapi.dev/api/quote/${tickersParam}?token=${BRAPI_TOKEN}`, {
        cache: 'no-store'
    });
    
    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            console.error(`[BrapiService] Erro de Autenticação (Token Inválido ou Expirado). Status: ${response.status}`);
            return { quotes: [], error: "Token Inválido" };
        }
        if (response.status === 404) {
             console.warn(`[BrapiService] Nenhum ticker encontrado para: ${tickersParam}`);
             return { quotes: [] };
        }
        console.warn(`[BrapiService] Batch Request Failed -> HTTP ${response.status}`);
        return { quotes: [], error: `Erro HTTP ${response.status}` };
    }

    const data = await response.json();
    
    if (data.results && Array.isArray(data.results)) {
        return { quotes: data.results as BrapiQuote[] };
    }
    
    return { quotes: [] };

  } catch (e: any) {
    console.error("Brapi Service Error:", e);
    return { quotes: [], error: "Erro de conexão API" };
  }
};
