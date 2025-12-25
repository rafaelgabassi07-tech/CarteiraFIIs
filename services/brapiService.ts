import { BrapiResponse, BrapiQuote } from '../types';

const BASE_URL = 'https://brapi.dev/api';
// Reduzimos o cache para 1 minuto para garantir cotações mais "real-time" já que o foco é apenas preço
const CACHE_KEY = 'investfiis_quotes_simple_cache';
const CACHE_DURATION = 60 * 1000; 

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
        // REFATORADO: Busca APENAS cotação simples.
        // Removemos 'modules=dividends' e 'range' para aliviar a API e focar em preço atual.
        const url = `${BASE_URL}/quote/${ticker}?token=${token}`;
        
        const response = await fetch(url);

        if (response.ok) {
            const data: BrapiResponse = await response.json();
            return data.results?.[0] || null;
        }
        
        console.warn(`Brapi: Falha ao buscar ${ticker} - Status: ${response.status}`);
        return null;
    } catch (error) {
        console.error(`Brapi: Erro de rede ao buscar ${ticker}:`, error);
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
    
    // Verifica cache
    if (cachedItem && (now - cachedItem.timestamp < CACHE_DURATION)) {
      validQuotes.push(cachedItem.data);
    } else {
      tickersToFetch.push(cleanTicker);
    }
  });

  if (tickersToFetch.length === 0) return validQuotes;

  // Busca em paralelo
  // Adiciona um pequeno delay entre requisições se houver muitos tickers para evitar Rate Limit da Brapi
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