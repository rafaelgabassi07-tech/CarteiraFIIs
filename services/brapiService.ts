
import { BrapiResponse, BrapiQuote } from '../types';

const BASE_URL = 'https://brapi.dev/api';
const CACHE_KEY = 'investfiis_quotes_simple_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos de cache

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

  try {
    // Brapi permite até 20 tickers por chamada no plano free, separados por vírgula
    // Fazemos em chunks caso o usuário tenha muitos ativos
    const chunkSize = 15;
    for (let i = 0; i < tickersToFetch.length; i += chunkSize) {
      const chunk = tickersToFetch.slice(i, i + chunkSize);
      const tickersString = chunk.join(',');
      const url = `${BASE_URL}/quote/${tickersString}?token=${token}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data: BrapiResponse = await response.json();
        if (data.results) {
          data.results.forEach(quote => {
            if (quote.symbol) {
              results.push(quote);
              cache[quote.symbol.toUpperCase()] = { data: quote, timestamp: now };
            }
          });
        }
      } else {
        if (response.status === 401 || response.status === 403) {
          return { quotes: results, error: "Token Brapi inválido ou expirado." };
        }
        if (response.status === 429) {
          return { quotes: results, error: "Limite de requisições Brapi atingido." };
        }
      }
    }

    saveCache(cache);
    return { quotes: results };

  } catch (error) {
    console.error(`[Brapi] Falha crítica de conexão`, error);
    return { quotes: results, error: "Erro de conexão com servidor de cotações." };
  }
};
