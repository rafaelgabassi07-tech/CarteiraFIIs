
import { BrapiResponse, BrapiQuote } from '../types';

const BASE_URL = 'https://brapi.dev/api';
const CACHE_KEY = 'investfiis_v3_quote_cache';

// Configuração de Horários da B3 (Aproximado)
const MARKET_OPEN_HOUR = 10;
const MARKET_CLOSE_HOUR = 18;

const getDynamicCacheDuration = (): number => {
  const now = new Date();
  const day = now.getDay(); // 0 = Domingo, 6 = Sábado
  const hour = now.getHours();

  const isWeekend = day === 0 || day === 6;
  const isTradingHours = !isWeekend && (hour >= MARKET_OPEN_HOUR && hour < MARKET_CLOSE_HOUR);

  if (isWeekend) {
    // Fim de semana: Cache de 72h (congela na sexta-feira até segunda)
    // Economiza requisições já que o mercado está fechado.
    return 72 * 60 * 60 * 1000;
  } 
  
  if (!isTradingHours) {
    // Dia útil, mas mercado fechado (Noite/Manhã cedo): Cache de 12h
    // Atualiza apenas uma vez durante a noite se necessário.
    return 12 * 60 * 60 * 1000;
  }

  // Horário de Pregão: Cache de 30 minutos
  return 30 * 60 * 1000;
};

export const getQuotes = async (tickers: string[], token: string, force = false): Promise<{ quotes: BrapiQuote[], error?: string }> => {
  if (!tickers.length || !token) return { quotes: [] };

  const uniqueTickers = Array.from(new Set(tickers.map(t => t.trim().toUpperCase())));
  
  let cache: Record<string, any> = {};
  try {
      cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  } catch (e) {
      console.warn("Cache corrompido, resetando...", e);
      localStorage.removeItem(CACHE_KEY);
  }

  const now = Date.now();
  const cacheDuration = getDynamicCacheDuration();
  
  const results: BrapiQuote[] = [];
  const toFetch: string[] = [];

  // Verifica cache individualmente com a duração dinâmica
  uniqueTickers.forEach(t => {
    if (!force && cache[t] && (now - cache[t].timestamp < cacheDuration)) {
      results.push(cache[t].data);
    } else {
      toFetch.push(t);
    }
  });

  if (!toFetch.length) return { quotes: results };

  try {
    // REQUISIÇÃO 1:1 ESTRITA (One Request Per Asset)
    const promises = toFetch.map(async (ticker) => {
      try {
        const url = `${BASE_URL}/quote/${ticker}?token=${token}&range=1d&interval=1d`;
        const res = await fetch(url);
        
        if (res.ok) {
          const data: BrapiResponse = await res.json();
          if (data.results && data.results.length > 0) {
            const quote = data.results[0];
            return { symbol: ticker, data: quote };
          }
        }
      } catch (err) {
        console.warn(`Erro no ativo ${ticker}:`, err);
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
    return { quotes: results, error: "Erro na conexão com Brapi" };
  }
};
