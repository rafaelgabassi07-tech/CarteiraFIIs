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
    const response = await fetch(`${BASE_URL}/quote/${tickerString}?token=${token}`);
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

// Mock function for dividends since Brapi free tier has limitations, 
// but structure is ready for expansion if token supports it.
export const getDividends = async (ticker: string, token: string) => {
    // In a real implementation with a paid/full token:
    // fetch(`${BASE_URL}/quote/${ticker}?token=${token}&modules=dividends`)
    return [];
};