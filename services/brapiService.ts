import { BrapiResponse, BrapiQuote } from '../types';

const BASE_URL = 'https://brapi.dev/api';
const CACHE_KEY = 'investfiis_quotes_cache';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutos

interface CacheItem {
  data: BrapiQuote;
  timestamp: number;
}

interface QuoteCache {
  [ticker: string]: CacheItem;
}

// Helper para ler o cache
const loadCache = (): QuoteCache => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch (e) {
    console.warn("Erro ao ler cache de cotações", e);
    return {};
  }
};

// Helper para salvar o cache
const saveCache = (cache: QuoteCache) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn("Erro ao salvar cache de cotações", e);
  }
};

// Busca um único ticker com todos os módulos necessários
const fetchSingleQuote = async (ticker: string, token: string): Promise<BrapiQuote | null> => {
    try {
        // Solicita explicitamente summary e dividends para cada ativo
        const response = await fetch(`${BASE_URL}/quote/${ticker}?token=${token}&modules=summary,dividends`);
        
        if (response.ok) {
            const data: BrapiResponse = await response.json();
            return data.results?.[0] || null;
        } else {
            console.warn(`Erro ao buscar ${ticker}: ${response.status}`);
            return null;
        }
    } catch (error) {
        console.error(`Erro de rede ao buscar ${ticker}:`, error);
        return null;
    }
};

export const getQuotes = async (tickers: string[], token: string): Promise<BrapiQuote[]> => {
  if (!tickers.length) return [];
  if (!token) return [];

  const cache = loadCache();
  const now = Date.now();
  
  const validQuotes: BrapiQuote[] = [];
  const tickersToFetch: string[] = [];

  // 1. Verifica Cache
  tickers.forEach(ticker => {
    const cleanTicker = ticker.trim().toUpperCase();
    if (!cleanTicker) return;

    const cachedItem = cache[cleanTicker];
    if (cachedItem && (now - cachedItem.timestamp < CACHE_DURATION)) {
      validQuotes.push(cachedItem.data);
    } else {
      tickersToFetch.push(cleanTicker);
    }
  });

  // 2. Se tudo estiver em cache, retorna
  if (tickersToFetch.length === 0) {
    return validQuotes;
  }

  // 3. Busca Individual em Paralelo (Promise.all)
  // Isso garante que cada ativo seja tratado isoladamente. Se um falhar, os outros funcionam.
  // Resolve o problema de "Expectation Failed" em lotes mistos.
  const promises = tickersToFetch.map(t => fetchSingleQuote(t, token));
  const results = await Promise.all(promises);

  // 4. Processa resultados e atualiza cache
  results.forEach(quote => {
    if (quote) {
      cache[quote.symbol] = {
        data: quote,
        timestamp: now
      };
      validQuotes.push(quote);
    }
  });

  // 5. Persiste cache se houver novidades
  if (validQuotes.length > 0) {
    saveCache(cache);
  }

  return validQuotes;
};

export const getDividends = async (ticker: string, token: string) => {
    return [];
};