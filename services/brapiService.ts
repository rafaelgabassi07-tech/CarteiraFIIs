
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
    const chunkSize = 15;
    for (let i = 0; i < toFetch.length; i += chunkSize) {
      const chunk = toFetch.slice(i, i + chunkSize);
      const url = `${BASE_URL}/quote/${chunk.join(',')}?token=${token}`;
      const res = await fetch(url);
      
      if (res.ok) {
        const data: BrapiResponse = await res.json();
        data.results.forEach(q => {
          if (q.symbol) {
            results.push(q);
            cache[q.symbol.toUpperCase()] = { data: q, timestamp: now };
          }
        });
      }
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    return { quotes: results };
  } catch (e) {
    return { quotes: results, error: "Erro na Brapi" };
  }
};
