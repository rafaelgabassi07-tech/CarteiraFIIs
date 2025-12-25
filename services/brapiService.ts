import { BrapiResponse, BrapiQuote } from '../types';

const BASE_URL = 'https://brapi.dev/api';

export const getQuotes = async (tickers: string[], token: string): Promise<BrapiQuote[]> => {
  if (!tickers.length) return [];
  if (!token) {
    console.warn("Brapi Token not set");
    return [];
  }

  const tickerString = tickers.join(',');
  try {
    // Added 'modules=dividends' to fetch dividend history
    const response = await fetch(`${BASE_URL}/quote/${tickerString}?token=${token}&modules=summary,dividends`);
    if (!response.ok) {
      throw new Error('Failed to fetch quotes');
    }
    const data: BrapiResponse = await response.json();
    return data.results;
  } catch (error) {
    console.error("Error fetching quotes:", error);
    return [];
  }
};

export const getDividends = async (ticker: string, token: string) => {
    // This is now handled by getQuotes via modules param, 
    // but keeping function signature for compatibility if needed elsewhere.
    return [];
};