
import { BrapiQuote } from '../types';

// Função segura para obter o Token com fallback
const getBrapiToken = () => {
    // 1. Tenta via import.meta.env (Padrão Vite - Recomendado: VITE_BRAPI_TOKEN)
    const viteToken = import.meta.env.VITE_BRAPI_TOKEN;
    if (viteToken) return viteToken;

    // 2. Tenta via process.env (Injeção via define no vite.config.ts: BRAPI_TOKEN)
    // O Vite substitui 'process.env.BRAPI_TOKEN' pelo valor string durante o build.
    // Removemos a verificação de 'process' para permitir que a substituição funcione mesmo no browser.
    try {
        // @ts-ignore
        const envToken = process.env.BRAPI_TOKEN;
        if (envToken) return envToken.replace(/"/g, '');
    } catch (e) {
        // Ignora ReferenceError se process não estiver definido e a substituição não ocorrer
    }

    return '';
};

const BRAPI_TOKEN = getBrapiToken();
console.log('[BrapiService] Token Loaded:', BRAPI_TOKEN ? `YES (Length: ${BRAPI_TOKEN.length})` : 'NO');

export const isTokenValid = () => !!BRAPI_TOKEN && BRAPI_TOKEN.length > 5;

/**
 * Busca cotações de ativos na API da Brapi.
 * Refatorado para buscar em lote (batch) para evitar rate limiting.
 */
export const getQuotes = async (tickers: string[]): Promise<{ quotes: BrapiQuote[], error?: string }> => {
  if (!tickers || tickers.length === 0) {
    return { quotes: [] };
  }
  
  if (!isTokenValid()) {
    console.warn("[BrapiService] Token not found or invalid. Cotações em tempo real indisponíveis.");
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
