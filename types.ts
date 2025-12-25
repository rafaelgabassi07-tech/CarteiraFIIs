export enum AssetType {
  STOCK = 'ACAO',
  FII = 'FII'
}

export interface Transaction {
  id: string;
  ticker: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  date: string; // ISO date
  assetType: AssetType;
}

export interface AssetPosition {
  ticker: string;
  quantity: number;
  averagePrice: number;
  currentPrice?: number;
  assetType: AssetType;
  logoUrl?: string;
  totalDividends?: number; // Sum of dividends received
}

// Brapi API Types
export interface Dividend {
  assetIssued: string;
  paymentDate: string;
  rate: number;
  relatedTo: string;
  approvedOn: string;
  lastDatePrior: string; // Data Com
  label: string;
  type: string; // "DIVIDEND" or "JCP"
}

export interface BrapiQuote {
  symbol: string;
  shortName: string;
  longName: string;
  currency: string;
  regularMarketPrice: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketDayRange: string;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketTime: string;
  marketCap: number;
  volume: number;
  regularMarketVolume: number;
  regularMarketPreviousClose: number;
  regularMarketOpen: number;
  fiftyTwoWeekRange: string;
  fiftyTwoWeekLow: number;
  fiftyTwoWeekHigh: number;
  priceEarnings: number;
  earningsPerShare: number;
  logourl: string;
  dividendsData?: {
    cashDividends: Dividend[];
  };
}

export interface BrapiResponse {
  results: BrapiQuote[];
}

export interface AppSettings {
  brapiToken: string;
}