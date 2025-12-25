
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
 * Adicionado parâmetro forceRefresh para ignorar o cache.
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
    
    // Se NÃO for forçado E o cache for válido, usa o cache
    if (!forceRefresh && isCacheValid) {
      validQuotes.push(cachedItem.data);
    } else {
      tickersToFetch.push(ticker);
    }
  });

  if (tickersToFetch.length === 0) return validQuotes;

  // Busca em lotes para otimizar
  const BATCH_SIZE = 15; 
  const newQuotes: BrapiQuote[] = [];

  for (let i = 0; i < tickersToFetch.length; i += BATCH_SIZE) {
    const chunk = tickersToFetch.slice(i, i + BATCH_SIZE);
    const tickersParam = chunk.join(',');

    try {
      const url = `${BASE_URL}/quote/${tickersParam}?token=${token}`;
      const response = await fetch(url);

      if (response.ok) {
        const data: BrapiResponse = await response.json();
        if (data.results) {
          newQuotes.push(...data.results);
        }
      } else {
        console.warn(`Brapi: Falha na requisição (${response.status})`);
      }
    } catch (error) {
      console.error(`Brapi: Erro na cotação de ${tickersParam}`, error);
    }
  }

  // Atualiza o cache com os novos dados
  newQuotes.forEach(quote => {
    if (quote?.symbol) {
      cache[quote.symbol] = { data: quote, timestamp: now };
    }
  });

  saveCache(cache);
  
  // Mescla o que estava válido no cache (se não forçado) com o que acabamos de buscar
  const allQuotes = [...validQuotes, ...newQuotes];
  const uniqueMap = new Map<string, BrapiQuote>();
  allQuotes.forEach(q => uniqueMap.set(q.symbol, q));
  
  return Array.from(uniqueMap.values());
};
