
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
 * Alterado para buscar UM POR VEZ (individualmente) conforme solicitado,
 * mas em paralelo para performance.
 */
export const getQuotes = async (tickers: string[]): Promise<{ quotes: BrapiQuote[], error?: string }> => {
  if (!tickers || tickers.length === 0) {
    return { quotes: [] };
  }
  
  if (!isTokenValid()) {
    console.warn("[BrapiService] Token not found or invalid. Cotações em tempo real indisponíveis.");
    return { quotes: [], error: "Token não configurado" };
  }

  const uniqueTickers = Array.from(new Set(tickers.map(t => t.trim().toUpperCase())));
  
  try {
    // Busca individual (um request por ticker) em paralelo
    const promises = uniqueTickers.map(async (ticker) => {
        try {
            const response = await fetch(`https://brapi.dev/api/quote/${ticker}?token=${BRAPI_TOKEN}`, {
                cache: 'no-store'
            });

            if (!response.ok) {
                console.warn(`[BrapiService] Falha ao buscar ${ticker}: ${response.status}`);
                return null;
            }

            const data = await response.json();
            if (data.results && Array.isArray(data.results) && data.results.length > 0) {
                return data.results[0] as BrapiQuote;
            }
            return null;
        } catch (err) {
            console.error(`[BrapiService] Erro ao buscar ${ticker}`, err);
            return null;
        }
    });

    const results = await Promise.all(promises);
    const validQuotes = results.filter((q): q is BrapiQuote => q !== null);

    return { quotes: validQuotes };

  } catch (e: any) {
    console.error("Brapi Service Error:", e);
    return { quotes: [], error: "Erro de conexão API" };
  }
};
