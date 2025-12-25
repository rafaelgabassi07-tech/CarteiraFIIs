import { BrapiResponse, BrapiQuote } from '../types';

const BASE_URL = 'https://brapi.dev/api';
const CACHE_KEY = 'investfiis_quotes_simple_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos de cache para economizar requisições

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

export const getQuotes = async (tickers: string[], token: string): Promise<BrapiQuote[]> => {
  if (!tickers.length || !token) return [];

  const cache = loadCache();
  const now = Date.now();
  const validQuotes: BrapiQuote[] = [];
  const tickersToFetch: string[] = [];

  // 1. Verifica Cache
  const uniqueTickers = Array.from(new Set(tickers.map(t => t.trim().toUpperCase())));
  
  uniqueTickers.forEach(ticker => {
    if (!ticker) return;

    const cachedItem = cache[ticker];
    if (cachedItem && (now - cachedItem.timestamp < CACHE_DURATION)) {
      validQuotes.push(cachedItem.data);
    } else {
      tickersToFetch.push(ticker);
    }
  });

  // Se tudo estiver em cache, retorna
  if (tickersToFetch.length === 0) return validQuotes;

  // 2. Busca em Lotes (Batch Fetching)
  // A API da Brapi aceita múltiplos tickers separados por vírgula (ex: /quote/PETR4,VALE3)
  // Isso reduz drasticamente o número de conexões HTTP e evita erros 429/417
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
        if (data.results && Array.isArray(data.results)) {
          newQuotes.push(...data.results);
        }
      } else {
        if (response.status === 401) {
            console.error("Brapi: Token de acesso inválido ou expirado. Verifique nas configurações.");
        }
        console.warn(`Brapi: Erro ${response.status} ao buscar lote: ${tickersParam}`);
      }
    } catch (error) {
      console.error(`Brapi: Erro de rede`, error);
    }
    
    // Pequeno delay defensivo entre lotes
    if (i + BATCH_SIZE < tickersToFetch.length) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  // 3. Atualiza Cache e Mescla Resultados
  newQuotes.forEach(quote => {
    if (quote && quote.symbol) {
      cache[quote.symbol] = {
        data: quote,
        timestamp: now
      };
      // Atualiza a lista de válidos caso tenhamos buscado algo que já estava (raro) ou novo
      // Aqui apenas adicionamos à lista de retorno
    }
  });

  saveCache(cache);
  
  // Retorna combinando o que estava em cache com o que foi buscado agora
  // Filtrando duplicatas por garantia
  const allQuotes = [...validQuotes, ...newQuotes];
  const uniqueMap = new Map<string, BrapiQuote>();
  allQuotes.forEach(q => uniqueMap.set(q.symbol, q));
  
  return Array.from(uniqueMap.values());
};