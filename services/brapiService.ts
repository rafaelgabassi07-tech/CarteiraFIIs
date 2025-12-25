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

// Função para buscar UM único ativo
const fetchSingleQuote = async (ticker: string, token: string): Promise<BrapiQuote | null> => {
    try {
        const url = `${BASE_URL}/quote/${ticker}?token=${token}`;
        const response = await fetch(url);

        if (response.ok) {
            const data: BrapiResponse = await response.json();
            // Brapi retorna array results mesmo para single quote
            return data.results?.[0] || null;
        }
        
        console.warn(`Brapi: Falha ao buscar ${ticker} - Status: ${response.status}`);
        return null;
    } catch (error) {
        console.error(`Brapi: Erro de rede em ${ticker}:`, error);
        return null;
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

  // 2. Busca dados novos SEQUENCIALMENTE ou em PEQUENOS LOTES PARALELOS
  // Para respeitar a exigência de "uma requisição por ativo" sem causar erro 417,
  // processamos em blocos de 2 requisições simultâneas com um pequeno delay.
  
  const BATCH_SIZE = 2; // Máximo de requisições paralelas
  const DELAY_MS = 300; // Delay entre lotes para não sobrecarregar
  
  const newQuotes: BrapiQuote[] = [];

  for (let i = 0; i < tickersToFetch.length; i += BATCH_SIZE) {
      const chunk = tickersToFetch.slice(i, i + BATCH_SIZE);
      
      // Executa o lote atual
      const promises = chunk.map(t => fetchSingleQuote(t, token));
      const results = await Promise.all(promises);
      
      results.forEach(r => {
          if (r) newQuotes.push(r);
      });

      // Se ainda houver mais itens, espera um pouco antes do próximo lote
      if (i + BATCH_SIZE < tickersToFetch.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
  }

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
  
  // Retorna os dados do cache (que agora incluem os novos) para garantir ordem correta se necessário
  // Mas aqui apenas juntamos as listas
  return [...validQuotes, ...newQuotes];
};