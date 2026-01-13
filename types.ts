
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

export interface AssetFundamentals {
  p_vp?: number;
  p_l?: number;
  dy_12m?: number;
  roe?: number; // Novo: Return on Equity
  vacancy?: number; // Novo: Vacância Física (FIIs)
  liquidity?: string;
  shareholders?: string;
  description?: string;
  market_cap?: string;
  sentiment?: 'Otimista' | 'Neutro' | 'Pessimista' | string;
  sentiment_reason?: string;
  sources?: { title: string; uri: string }[]; // Links de onde a IA tirou a info
}

export interface AssetPosition extends AssetFundamentals {
  ticker: string;
  quantity: number;
  averagePrice: number;
  currentPrice?: number;
  dailyChange?: number; // Variação do dia em %
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
  regularMarketChangePercent?: number; // Variação diária vinda da API
  logourl: string;
}

export interface BrapiResponse {
  results: BrapiQuote[];
}

export type ReleaseNoteType = 'feat' | 'fix' | 'perf' | 'ui';

export interface ReleaseNote {
  type: ReleaseNoteType;
  title: string;
  desc: string;
}

export interface VersionData {
  version: string;
  date: string;
  notes: ReleaseNote[];
}

export type NotificationCategory = 'payment' | 'datacom' | 'general' | 'update';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'update';
  category?: NotificationCategory;
  timestamp: number;
  read: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

export interface MarketIndicators {
  ipca_cumulative: number;
  start_date_used: string;
}

export interface EvolutionPoint {
    rawDate: string;
    date: string;
    invested: number;
    adjusted: number;
    value: number;
    monthlyInflationCost: number;
}

// Novos tipos para o sistema de saúde
export type ServiceStatus = 'operational' | 'degraded' | 'error' | 'checking' | 'unknown';

export interface ServiceMetric {
  id: string;
  label: string;
  url?: string;
  icon?: any; // Mantido como any para compatibilidade com lucide-react icons passados como ref/componente
  status: ServiceStatus;
  latency: number | null;
  message?: string;
}

// Logger Types
export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  data?: any[];
}
