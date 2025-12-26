
import { BrapiResponse, BrapiQuote } from '../types';

const BASE_URL = 'https://brapi.dev/api';
const CACHE_KEY = 'investfiis_quotes_simple_cache';
const CACHE_DURATION = 2 * 60 * 1000; // Reduzido para 2 minutos para maior fluidez

interface CacheItem {
  data: BrapiQuote;
  timestamp: number;
}

const loadCache = (): Record<string, CacheItem> => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  } catch (e) {
    return {};
  }
};

const saveCache = (cache: Record<string, CacheItem>) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {}
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getQuotes = async (tickers: string[], token: string, forceRefresh = false): Promise<{ quotes: BrapiQuote[], error?: string }> => {
  if (!tickers.length || !token) return { quotes: [] };

  const cache = loadCache();
  const now = Date.now();
  const results: BrapiQuote[] = [];
  const tickersToFetch: string[] = [];

  const uniqueTickers = Array.from(new Set(tickers.map(t => t.trim().toUpperCase())));
  
  uniqueTickers.forEach(ticker => {
    const cachedItem = cache[ticker];
    const isCacheValid = cachedItem && (now - cachedItem.timestamp < CACHE_DURATION);
    
    if (!forceRefresh && isCacheValid) {
      results.push(cachedItem.data);
    } else {
      tickersToFetch.push(ticker);
    }
  });

  if (tickersToFetch.length === 0) return { quotes: results };

  let errorOccurred = "";

  for (const ticker of tickersToFetch) {
    try {
      const url = `${BASE_URL}/quote/${ticker}?token=${token}`;
      const response = await fetch(url);

      if (response.ok) {
        const data: BrapiResponse = await response.json();
        if (data.results && data.results[0]) {
          const quote = data.results[0];
          results.push(quote);
          cache[ticker] = { data: quote, timestamp: now };
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData.message || 'Erro na API';
        
        if (response.status === 401 || response.status === 403) {
          errorOccurred = "Token Brapi inválido ou expirado.";
          break; // Interrompe pois o token não funciona
        }
        
        if (response.status === 429) {
          errorOccurred = "Limite de requisições do seu plano Brapi atingido.";
          break;
        }

        console.error(`[Brapi] Erro no ativo ${ticker}:`, msg);
      }
      
      // Delay de segurança entre chamadas individuais
      await sleep(150);
      
    } catch (error) {
      console.error(`[Brapi] Falha de rede para ${ticker}`);
    }
  }

  saveCache(cache);
  return { 
    quotes: results, 
    error: errorOccurred || undefined 
  };
};
