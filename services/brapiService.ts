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

// Busca um único ticker (usado no fallback)
const fetchSingleQuote = async (ticker: string, token: string): Promise<BrapiQuote | null> => {
    try {
        const response = await fetch(`${BASE_URL}/quote/${ticker}?token=${token}&modules=summary,dividends`);
        if (response.ok) {
            const data: BrapiResponse = await response.json();
            return data.results?.[0] || null;
        }
        return null;
    } catch (error) {
        return null;
    }
};

// Busca múltiplos tickers de uma vez
const fetchBatchQuotes = async (tickers: string[], token: string): Promise<BrapiQuote[]> => {
  // Limpeza dos tickers: remove espaços, converte para uppercase e remove vazios
  const sanitizedTickers = tickers
    .map(t => t.trim().toUpperCase())
    .filter(t => t.length > 0);

  if (sanitizedTickers.length === 0) return [];
  
  try {
    const tickersString = sanitizedTickers.join(',');
    const response = await fetch(`${BASE_URL}/quote/${tickersString}?token=${token}&modules=summary,dividends`);
    
    if (!response.ok) {
      // Estratégia de Fallback: Se der erro 417 (Expectation Failed) ou 404 no lote, tenta buscar um por um
      // Brapi costuma retornar 417 se um dos tickers for inválido.
      if ((response.status === 417 || response.status === 404) && sanitizedTickers.length > 0) {
         console.warn(`Brapi retornou ${response.status} para o lote. Tentando buscar individualmente...`);
         
         const results: BrapiQuote[] = [];
         // Executa em paralelo para ser mais rápido
         const promises = sanitizedTickers.map(t => fetchSingleQuote(t, token));
         const individualResults = await Promise.all(promises);
         
         individualResults.forEach(res => {
             if (res) results.push(res);
         });
         
         return results;
      }

      console.warn(`Falha ao buscar cotações: ${response.status} - ${response.statusText}`);
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
    // console.warn("Brapi Token não configurado");
    return [];
  }

  const cache = loadCache();
  const now = Date.now();
  
  const validQuotes: BrapiQuote[] = [];
  const tickersToFetch: string[] = [];

  // 1. Separa o que está em cache (e válido) do que precisa ser buscado
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

  // 2. Se tudo estiver em cache, retorna imediatamente
  if (tickersToFetch.length === 0) {
    return validQuotes;
  }

  // 3. Busca os tickers faltantes EM LOTE (com fallback interno)
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