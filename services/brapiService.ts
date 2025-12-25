
import { BrapiResponse, BrapiQuote } from '../types';

const BASE_URL = 'https://brapi.dev/api';
const CACHE_KEY = 'investfiis_quotes_simple_cache';
const CACHE_DURATION = 5 * 60 * 1000; // Cotações expiram em 5 minutos

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
 * Brapi: Focada EXCLUSIVAMENTE em preços atuais e logotipos.
 */
export const getQuotes = async (tickers: string[], token: string): Promise<BrapiQuote[]> => {
  if (!tickers.length || !token) return [];

  const cache = loadCache();
  const now = Date.now();
  const validQuotes: BrapiQuote[] = [];
  const tickersToFetch: string[] = [];

  const uniqueTickers = Array.from(new Set(tickers.map(t => t.trim().toUpperCase())));
  
  uniqueTickers.forEach(ticker => {
    const cachedItem = cache[ticker];
    if (cachedItem && (now - cachedItem.timestamp < CACHE_DURATION)) {
      validQuotes.push(cachedItem.data);
    } else {
      tickersToFetch.push(ticker);
    }
  });

  if (tickersToFetch.length === 0) return validQuotes;

  // Busca em lotes para otimizar, mas focado apenas no campo de cotação
  const BATCH_SIZE = 15; 
  const newQuotes: BrapiQuote[] = [];

  for (let i = 0; i < tickersToFetch.length; i += BATCH_SIZE) {
    const chunk = tickersToFetch.slice(i, i + BATCH_SIZE);
    const tickersParam = chunk.join(',');

    try {
      // Pedimos apenas os campos necessários para economizar banda
      const url = `${BASE_URL}/quote/${tickersParam}?token=${token}`;
      const response = await fetch(url);

      if (response.ok) {
        const data: BrapiResponse = await response.json();
        if (data.results) {
          newQuotes.push(...data.results);
        }
      }
    } catch (error) {
      console.error(`Brapi: Erro na cotação de ${tickersParam}`, error);
    }
  }

  newQuotes.forEach(quote => {
    if (quote?.symbol) {
      cache[quote.symbol] = { data: quote, timestamp: now };
    }
  });

  saveCache(cache);
  
  const allQuotes = [...validQuotes, ...newQuotes];
  const uniqueMap = new Map<string, BrapiQuote>();
  allQuotes.forEach(q => uniqueMap.set(q.symbol, q));
  
  return Array.from(uniqueMap.values());
};
