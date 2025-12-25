
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
 * ALTERADO: Requisições individuais por ativo (sem lotes) conforme solicitado.
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

  const newQuotes: BrapiQuote[] = [];

  // Mapeia cada ticker para uma Promise de requisição individual
  const promises = tickersToFetch.map(async (ticker) => {
    console.log(`[Brapi] Buscando ativo individual: ${ticker}`);
    
    try {
      // Endpoint padrão para 1 ativo
      const url = `${BASE_URL}/quote/${ticker}?token=${token}`;
      const response = await fetch(url);

      if (response.ok) {
        const data: BrapiResponse = await response.json();
        // A API retorna um array 'results' mesmo para requisição única
        return data.results?.[0]; 
      } else {
        console.warn(`[Brapi] Falha na requisição para ${ticker}: Status ${response.status}`);
        return null;
      }
    } catch (error) {
      console.error(`[Brapi] Erro de conexão para ${ticker}`, error);
      return null;
    }
  });

  // Aguarda todas as requisições individuais terminarem (Promise.all permite paralelismo)
  const results = await Promise.all(promises);

  // Filtra os sucessos e adiciona ao array final
  results.forEach(quote => {
    if (quote) {
      newQuotes.push(quote);
      // Atualiza o cache individualmente
      if (quote.symbol) {
        cache[quote.symbol] = { data: quote, timestamp: now };
      }
    }
  });

  saveCache(cache);
  
  // Mescla o que estava válido no cache com os novos dados obtidos
  const allQuotes = [...validQuotes, ...newQuotes];
  const uniqueMap = new Map<string, BrapiQuote>();
  allQuotes.forEach(q => uniqueMap.set(q.symbol, q));
  
  return Array.from(uniqueMap.values());
};
