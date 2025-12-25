
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
  date: string; // Formato YYYY-MM-DD
  assetType: AssetType;
}

export interface AssetPosition {
  ticker: string;
  quantity: number;
  averagePrice: number;
  currentPrice?: number;
  assetType: AssetType;
  logoUrl?: string;
  totalDividends?: number;
  segment?: string;
}

export interface DividendReceipt {
  id: string;
  ticker: string;
  type: string;
  dateCom: string;
  paymentDate: string;
  rate: number;
  quantityOwned: number;
  totalReceived: number;
  assetType?: AssetType;
}

export interface BrapiQuote {
  symbol: string;
  shortName: string;
  longName: string;
  regularMarketPrice: number;
  logourl: string;
}

export interface BrapiResponse {
  results: BrapiQuote[];
}
