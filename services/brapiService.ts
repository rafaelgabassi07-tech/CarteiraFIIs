
import { BrapiResponse, BrapiQuote } from '../types';

const BASE_URL = 'https://brapi.dev/api';
const CACHE_KEY = 'investfiis_quotes_simple_cache';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutos de cache

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

/**
 * Brapi Service Ajustado:
 * Realiza uma requisição HTTP separada para cada ativo (1:1).
 * Utiliza Promise.all para paralelizar as chamadas.
 */
export const getQuotes = async (tickers: string[], token: string, forceRefresh = false): Promise<BrapiQuote[]> => {
  if (!tickers.length || !token) return [];

  const cache = loadCache();
  const now = Date.now();
  const validQuotes: BrapiQuote[] = [];
  const tickersToFetch: string[] = [];

  const uniqueTickers = Array.from(new Set(tickers.map(t => t.trim().toUpperCase())));
  
  uniqueTickers.forEach(ticker => {
    const cachedItem = cache[ticker];
    const isCacheValid = cachedItem && (now - cachedItem.timestamp < CACHE_DURATION);
    
    if (!forceRefresh && isCacheValid) {
      validQuotes.push(cachedItem.data);
    } else {
      tickersToFetch.push(ticker);
    }
  });

  if (tickersToFetch.length === 0) return validQuotes;

  const newQuotes: BrapiQuote[] = [];

  // Mapeia cada ticker para uma Promise de requisição individual
  const promises = tickersToFetch.map(async (ticker) => {
    // console.log(`[Brapi] Buscando ativo individual: ${ticker}`);
    try {
      const url = `${BASE_URL}/quote/${ticker}?token=${token}`;
      const response = await fetch(url);

      if (response.ok) {
        const data: BrapiResponse = await response.json();
        // A API retorna { results: [ ... ] }. Pegamos todos os resultados (geralmente 1 nesse caso).
        return data.results || [];
      } else {
        console.warn(`[Brapi] Erro ${response.status} ao buscar ${ticker}`);
        return null;
      }
    } catch (error) {
      console.error(`[Brapi] Falha de rede ao buscar ${ticker}`, error);
      return null;
    }
  });

  // Aguarda todas as requisições finalizarem (em paralelo)
  const results = await Promise.all(promises);

  // Processa os resultados
  results.forEach(tickerResults => {
    if (tickerResults && Array.isArray(tickerResults)) {
      tickerResults.forEach(quote => {
        newQuotes.push(quote);
        if (quote.symbol) {
          cache[quote.symbol] = { data: quote, timestamp: now };
        }
      });
    }
  });

  saveCache(cache);
  
  const allQuotes = [...validQuotes, ...newQuotes];
  
  // Remove duplicatas caso existam
  const uniqueMap = new Map<string, BrapiQuote>();
  allQuotes.forEach(q => uniqueMap.set(q.symbol, q));
  
  return Array.from(uniqueMap.values());
};
