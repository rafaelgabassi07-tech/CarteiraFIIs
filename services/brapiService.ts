
import { BrapiResponse, BrapiQuote } from '../types';

const BASE_URL = 'https://brapi.dev/api';
const CACHE_KEY = 'investfiis_quotes_simple_cache';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutos de cache

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

// Função auxiliar para criar um atraso entre requisições
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Brapi Service - Modo Individual:
 * Realiza requisições ticker por ticker para tokens que não suportam lote (batch).
 * Implementa throttling para evitar erros de Rate Limit.
 */
export const getQuotes = async (tickers: string[], token: string, forceRefresh = false): Promise<BrapiQuote[]> => {
  if (!tickers.length || !token) return [];

  const cache = loadCache();
  const now = Date.now();
  const results: BrapiQuote[] = [];
  const tickersToFetch: string[] = [];

  const uniqueTickers = Array.from(new Set(tickers.map(t => t.trim().toUpperCase())));
  
  // 1. Filtrar o que já temos no cache válido
  uniqueTickers.forEach(ticker => {
    const cachedItem = cache[ticker];
    const isCacheValid = cachedItem && (now - cachedItem.timestamp < CACHE_DURATION);
    
    if (!forceRefresh && isCacheValid) {
      results.push(cachedItem.data);
    } else {
      tickersToFetch.push(ticker);
    }
  });

  if (tickersToFetch.length === 0) return results;

  // 2. Buscar o restante individualmente
  for (const ticker of tickersToFetch) {
    try {
      const url = `${BASE_URL}/quote/${ticker}?token=${token}`;
      const response = await fetch(url);

      if (response.ok) {
        const data: BrapiResponse = await response.json();
        if (data.results && data.results[0]) {
          const quote = data.results[0];
          results.push(quote);
          // Atualiza cache individual
          cache[ticker] = { data: quote, timestamp: now };
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error(`[Brapi] Erro ${response.status} no ativo ${ticker}:`, errorData.message || 'Erro desconhecido');
        
        // Se recebermos 429 (Too Many Requests), paramos o loop para não queimar o token
        if (response.status === 429) {
          console.warn("[Brapi] Limite de requisições atingido. Interrompendo busca.");
          break;
        }
      }
      
      // Pequeno delay (100ms) entre requisições para estabilidade
      await sleep(100);
      
    } catch (error) {
      console.error(`[Brapi] Falha de rede para ${ticker}:`, error);
    }
  }

  saveCache(cache);
  return results;
};
