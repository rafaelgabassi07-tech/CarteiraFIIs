
import { BrapiResponse, BrapiQuote } from '../types';

const BASE_URL = 'https://brapi.dev/api';
const CACHE_KEY = 'investfiis_quotes_simple_cache';
const CACHE_DURATION = 10 * 60 * 1000; // Aumentado para 10 min para reduzir chamadas

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
 * Brapi Service Otimizado:
 * Utiliza BATCH REQUESTS (Lotes) para evitar erro 429 (Too Many Requests).
 * Agrupa até 20 tickers por chamada de API.
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

  // Lógica de Chunking (Lotes) para evitar 429
  // A Brapi aceita vírgula: /quote/PETR4,VALE3,HGLG11
  const CHUNK_SIZE = 20; 
  const newQuotes: BrapiQuote[] = [];

  // Divide os tickers em grupos de 20
  const chunks = [];
  for (let i = 0; i < tickersToFetch.length; i += CHUNK_SIZE) {
    chunks.push(tickersToFetch.slice(i, i + CHUNK_SIZE));
  }

  // Processa os chunks sequencialmente (ou Promise.all com cuidado)
  const promises = chunks.map(async (chunk) => {
    const tickersParam = chunk.join(',');
    console.log(`[Brapi] Buscando lote: ${tickersParam}`);
    
    try {
      const url = `${BASE_URL}/quote/${tickersParam}?token=${token}`;
      const response = await fetch(url);

      if (response.ok) {
        const data: BrapiResponse = await response.json();
        return data.results || [];
      } else if (response.status === 429) {
        console.warn(`[Brapi] Erro 429 (Muitas requisições) para lote: ${tickersParam}`);
        return null;
      } else {
        console.warn(`[Brapi] Falha (${response.status}) para lote: ${tickersParam}`);
        return null;
      }
    } catch (error) {
      console.error(`[Brapi] Erro de rede para lote: ${tickersParam}`, error);
      return null;
    }
  });

  const results = await Promise.all(promises);

  results.forEach(batchResult => {
    if (batchResult) {
      batchResult.forEach(quote => {
        newQuotes.push(quote);
        if (quote.symbol) {
          cache[quote.symbol] = { data: quote, timestamp: now };
        }
      });
    }
  });

  saveCache(cache);
  
  const allQuotes = [...validQuotes, ...newQuotes];
  const uniqueMap = new Map<string, BrapiQuote>();
  allQuotes.forEach(q => uniqueMap.set(q.symbol, q));
  
  return Array.from(uniqueMap.values());
};
