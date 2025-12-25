import { BrapiResponse, BrapiQuote } from '../types';

const BASE_URL = 'https://brapi.dev/api';
const CACHE_KEY = 'investfiis_quotes_cache';
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutos

interface CacheItem {
  data: BrapiQuote;
  timestamp: number;
}

interface QuoteCache {
  [ticker: string]: CacheItem;
}

const loadCache = (): QuoteCache => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch (e) {
    return {};
  }
};

const saveCache = (cache: QuoteCache) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {}
};

const fetchSingleQuote = async (ticker: string, token: string): Promise<BrapiQuote | null> => {
    try {
        // CRITICAL FIX: Adicionado parameter range=5y para buscar histórico longo de dividendos
        // Sem isso, a API retorna apenas dados recentes, quebrando o cálculo para transações antigas.
        const url = `${BASE_URL}/quote/${ticker}?token=${token}&modules=dividends&range=5y`;
        const response = await fetch(url);

        if (response.ok) {
            const data: BrapiResponse = await response.json();
            return data.results?.[0] || null;
        }
        
        // Fallback: Tenta sem modules, mas ainda pedindo range longo caso a API suporte
        const fallbackResponse = await fetch(`${BASE_URL}/quote/${ticker}?token=${token}&range=5y`);
        if (fallbackResponse.ok) {
            const data: BrapiResponse = await fallbackResponse.json();
            return data.results?.[0] || null;
        }

        return null;
    } catch (error) {
        console.error(`Erro ao buscar ${ticker}:`, error);
        return null;
    }
};

export const getQuotes = async (tickers: string[], token: string): Promise<BrapiQuote[]> => {
  if (!tickers.length || !token) return [];

  const cache = loadCache();
  const now = Date.now();
  const validQuotes: BrapiQuote[] = [];
  const tickersToFetch: string[] = [];

  tickers.forEach(ticker => {
    const cleanTicker = ticker.trim().toUpperCase();
    if (!cleanTicker) return;

    const cachedItem = cache[cleanTicker];
    // Se tiver cache válido e tiver dados de dividendos, usa o cache
    // Reduzido tempo de validação do cache para garantir dados frescos na depuração
    if (cachedItem && (now - cachedItem.timestamp < CACHE_DURATION)) {
      validQuotes.push(cachedItem.data);
    } else {
      tickersToFetch.push(cleanTicker);
    }
  });

  if (tickersToFetch.length === 0) return validQuotes;

  // Busca em paralelo para agilizar
  const results = await Promise.all(tickersToFetch.map(t => fetchSingleQuote(t, token)));

  results.forEach(quote => {
    if (quote) {
      cache[quote.symbol] = {
        data: quote,
        timestamp: now
      };
      validQuotes.push(quote);
    }
  });

  saveCache(cache);
  return validQuotes;
};