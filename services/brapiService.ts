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

// Função interna para buscar UM único ativo
const fetchSingleTicker = async (ticker: string, token: string): Promise<BrapiQuote | null> => {
  try {
    const response = await fetch(`${BASE_URL}/quote/${ticker}?token=${token}&modules=summary,dividends`);
    
    if (!response.ok) {
      console.warn(`Falha ao buscar cotação para ${ticker}: ${response.status}`);
      return null;
    }
    
    const data: BrapiResponse = await response.json();
    
    // A API da Brapi retorna um array em 'results' mesmo para busca individual
    if (data.results && data.results.length > 0) {
      return data.results[0];
    }
    
    return null;
  } catch (error) {
    console.error(`Erro na requisição Brapi para ${ticker}:`, error);
    return null;
  }
};

export const getQuotes = async (tickers: string[], token: string): Promise<BrapiQuote[]> => {
  if (!tickers.length) return [];
  if (!token) {
    console.warn("Brapi Token not set");
    return [];
  }

  const cache = loadCache();
  const now = Date.now();
  
  const validQuotes: BrapiQuote[] = [];
  const tickersToFetch: string[] = [];

  // 1. Separa o que está em cache (e válido) do que precisa ser buscado
  tickers.forEach(ticker => {
    const cachedItem = cache[ticker];
    // Verifica se existe e se é mais recente que 10 minutos
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

  // 3. Busca os tickers faltantes INDIVIDUALMENTE (em paralelo)
  // console.log(`Buscando dados individualmente para: ${tickersToFetch.join(', ')}`);
  
  const promises = tickersToFetch.map(ticker => fetchSingleTicker(ticker, token));
  const results = await Promise.all(promises);

  // 4. Filtra resultados nulos e atualiza o cache
  const newQuotes: BrapiQuote[] = [];
  
  results.forEach(quote => {
    if (quote) {
      newQuotes.push(quote);
      // Atualiza Cache
      cache[quote.symbol] = {
        data: quote,
        timestamp: now
      };
      validQuotes.push(quote);
    }
  });

  // 5. Persiste o cache atualizado se houver novos dados
  if (newQuotes.length > 0) {
    saveCache(cache);
  }

  return validQuotes;
};

export const getDividends = async (ticker: string, token: string) => {
    return [];
};