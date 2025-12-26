
import { BrapiResponse, BrapiQuote } from '../types';

const BASE_URL = 'https://brapi.dev/api';
const CACHE_KEY = 'investfiis_v3_quote_cache';
const CACHE_DURATION = 15 * 60 * 1000; // 15 min

export const getQuotes = async (tickers: string[], token: string, force = false): Promise<{ quotes: BrapiQuote[], error?: string }> => {
  if (!tickers.length || !token) return { quotes: [] };

  const uniqueTickers = Array.from(new Set(tickers.map(t => t.trim().toUpperCase())));
  const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  const now = Date.now();
  
  const results: BrapiQuote[] = [];
  const toFetch: string[] = [];

  uniqueTickers.forEach(t => {
    if (!force && cache[t] && (now - cache[t].timestamp < CACHE_DURATION)) {
      results.push(cache[t].data);
    } else {
      toFetch.push(t);
    }
  });

  if (!toFetch.length) return { quotes: results };

  try {
    // ALTERAÇÃO SOLICITADA: Requisição individual por ativo (1:1)
    // Utilizamos Promise.all para disparar todas em paralelo e não travar o app
    const promises = toFetch.map(async (ticker) => {
      try {
        const url = `${BASE_URL}/quote/${ticker}?token=${token}&range=1d&interval=1d`;
        const res = await fetch(url);
        
        if (res.ok) {
          const data: BrapiResponse = await res.json();
          // A Brapi retorna um array results mesmo na chamada individual
          if (data.results && data.results.length > 0) {
            const quote = data.results[0];
            return { symbol: ticker, data: quote };
          }
        }
      } catch (err) {
        console.warn(`Falha ao buscar ${ticker}`, err);
      }
      return null;
    });

    const fetchedResults = await Promise.all(promises);

    fetchedResults.forEach(item => {
      if (item && item.data) {
        results.push(item.data);
        cache[item.symbol] = { data: item.data, timestamp: now };
      }
    });

    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    return { quotes: results };
  } catch (e) {
    return { quotes: results, error: "Erro na Brapi" };
  }
};
