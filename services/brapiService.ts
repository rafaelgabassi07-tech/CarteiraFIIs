import { BrapiResponse, BrapiQuote } from '../types';

const BASE_URL = 'https://brapi.dev/api';
const CACHE_KEY = 'investfiis_quotes_cache';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutos em milissegundos

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

// Busca múltiplos tickers de uma vez
const fetchBatchQuotes = async (tickers: string[], token: string): Promise<BrapiQuote[]> => {
  if (tickers.length === 0) return [];
  
  try {
    const tickersString = tickers.join(',');
    const response = await fetch(`${BASE_URL}/quote/${tickersString}?token=${token}&modules=summary,dividends`);
    
    if (!response.ok) {
      console.warn(`Falha ao buscar cotações: ${response.status}`);
      return [];
    }
    
    const data: BrapiResponse = await response.json();
    return data.results || [];
  } catch (error) {
    console.error(`Erro na requisição Brapi em lote:`, error);
    return [];
  }
};

export const getQuotes = async (tickers: string[], token: string): Promise<BrapiQuote[]> => {
  if (!tickers.length) return [];
  if (!token) {
    console.warn("Brapi Token não configurado");
    return [];
  }

  const cache = loadCache();
  const now = Date.now();
  
  const validQuotes: BrapiQuote[] = [];
  const tickersToFetch: string[] = [];

  // 1. Separa o que está em cache (e válido) do que precisa ser buscado
  tickers.forEach(ticker => {
    const cachedItem = cache[ticker];
    if (cachedItem && (now - cachedItem.timestamp < CACHE_DURATION)) {
      validQuotes.push(cachedItem.data);
    } else {
      tickersToFetch.push(ticker);
    }
  });

  // 2. Se tudo estiver em cache, retorna imediatamente
  if (tickersToFetch.length === 0) {
    return validQuotes;
  }

  // 3. Busca os tickers faltantes EM LOTE
  const fetchedQuotes = await fetchBatchQuotes(tickersToFetch, token);

  // 4. Atualiza o cache e a lista de retornos
  fetchedQuotes.forEach(quote => {
    cache[quote.symbol] = {
      data: quote,
      timestamp: now
    };
    validQuotes.push(quote);
  });

  // 5. Persiste o cache atualizado se houver novos dados
  if (fetchedQuotes.length > 0) {
    saveCache(cache);
  }

  return validQuotes;
};

export const getDividends = async (ticker: string, token: string) => {
    return [];
};