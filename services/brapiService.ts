import { BrapiResponse, BrapiQuote } from '../types';

const BASE_URL = 'https://brapi.dev/api';
const CACHE_KEY = 'investfiis_quotes_simple_cache';
const CACHE_DURATION = 60 * 1000; // 1 minuto

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

// Função auxiliar para dividir array em pedaços (chunks)
// A Brapi aceita múltiplos tickers separados por vírgula, mas é bom limitar para não fazer URLs gigantes
const chunkArray = (array: string[], size: number): string[][] => {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};

const fetchBatchQuotes = async (tickers: string[], token: string): Promise<BrapiQuote[]> => {
    try {
        // Concatena tickers com vírgula (ex: PETR4,VALE3,MXRF11)
        const tickersParam = tickers.join(',');
        // Removemos explicitamente modules e range para garantir apenas dados fundamentais de preço
        const url = `${BASE_URL}/quote/${tickersParam}?token=${token}`;
        
        const response = await fetch(url);

        if (response.ok) {
            const data: BrapiResponse = await response.json();
            return data.results || [];
        }
        
        console.warn(`Brapi: Falha no lote ${tickersParam} - Status: ${response.status}`);
        return [];
    } catch (error) {
        console.error(`Brapi: Erro de rede no lote:`, error);
        return [];
    }
};

export const getQuotes = async (tickers: string[], token: string): Promise<BrapiQuote[]> => {
  if (!tickers.length || !token) return [];

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

  if (tickersToFetch.length === 0) return validQuotes;

  // 2. Busca dados novos em Lotes (Chunks de 20 ativos por vez)
  // Isso evita fazer dezenas de requisições simultâneas que causam erro 417/429
  const chunks = chunkArray(tickersToFetch, 20);
  
  const promises = chunks.map(chunk => fetchBatchQuotes(chunk, token));
  const resultsArrays = await Promise.all(promises);
  
  // Flatten results
  const newQuotes = resultsArrays.flat();

  // 3. Atualiza Cache
  newQuotes.forEach(quote => {
    if (quote && quote.symbol) {
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