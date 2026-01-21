

export enum AssetType {
  STOCK = 'ACAO',
  FII = 'FII'
}

export type ThemeType = 'light' | 'dark' | 'system';

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
  // Comuns
  p_vp?: number;
  p_l?: number;
  dy_12m?: number;
  roe?: number;
  liquidity?: string; // Liquidez Média Diária
  market_cap?: string; // Valor de Mercado
  
  // Ações - Eficiência e Crescimento
  net_margin?: number; // Margem Líquida
  gross_margin?: number; // Margem Bruta
  ebit_margin?: number; // Margem EBIT
  cagr_revenue?: number; // CAGR Receita 5a
  cagr_profits?: number; // CAGR Lucros 5a
  payout?: number; // Payout
  lpa?: number; // Lucro por Ação
  vpa?: number; // Valor Patrimonial por Ação
  
  // Ações - Dívida e Valuation
  ev_ebitda?: number;
  net_debt_ebitda?: number; // Dívida Líquida / EBITDA
  net_debt_equity?: number; // Dívida Líquida / PL

  // FIIs
  vacancy?: number; // Vacância Física
  assets_value?: string; // Patrimônio Líquido (R$)
  manager_type?: string; // Tipo de Gestão (Ativa/Passiva)
  segment_secondary?: string; // Segmento/Tipo de Fundo
  mandate?: string; // Mandato
  properties_count?: number; // Quantidade de Imóveis (se disponível)
  management_fee?: string; // Taxa de Administração
  last_dividend?: number; // Último Rendimento
  
  updated_at?: string; // Data da última atualização via IA/Crawler
  
  description?: string;
  sentiment?: 'Otimista' | 'Neutro' | 'Pessimista' | string;
  sentiment_reason?: string;
  sources?: { title: string; uri: string }[];
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
  updated_at?: string;
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

export type ServiceStatus = 'operational' | 'degraded' | 'error' | 'checking' | 'unknown';

export interface ServiceMetric {
  id: string;
  label: string;
  url?: string;
  icon?: any;
  status: ServiceStatus;
  latency: number | null;
  message?: string;
}

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  data?: any[];
}

// Novos tipos para a página de Mercado (Gemini Grounding)

export interface MarketHighlightFII {
    ticker: string;
    name: string;
    price: number;
    p_vp: number;
    dy_12m: number;
}

export interface MarketHighlightStock {
    ticker: string;
    name: string;
    price: number;
    p_l: number;
    p_vp: number;
}

export interface MarketVariation {
    ticker: string;
    variation_percent: number;
    price: number;
}

export interface MarketHighDividend {
    ticker: string;
    type: string;
    dy_12m: number;
    last_dividend: number;
}

export interface MarketOverview {
    market_status: string;
    sentiment_summary: string; // Novo campo
    last_update: string;
    highlights: {
        discounted_fiis: MarketHighlightFII[];
        discounted_stocks: MarketHighlightStock[];
        top_gainers: MarketVariation[]; // Mantido para compatibilidade, mas pode vir vazio
        top_losers: MarketVariation[]; // Mantido para compatibilidade
        high_dividend_yield: MarketHighDividend[];
    };
    sources?: { title: string; uri: string }[];
}

// Resultado da atualização do Scraper
export interface ScrapeResult {
    ticker: string;
    status: 'success' | 'error';
    message?: string;
    sourceMap?: {
        price: 'Brapi' | 'Investidor10' | 'N/A';
        fundamentals: 'Investidor10' | 'N/A';
    };
    details?: {
        price?: number;
        dy?: number;
        pvp?: number;
        pl?: number;
        vacancy?: number;
    };
    // Novo: Dados brutos retornados pelo scraper para atualização imediata
    rawFundamentals?: any; 
    dividendsFound?: {
        type: string;
        dateCom: string;
        paymentDate: string;
        rate: number;
    }[];
}

export interface UpdateReportData {
    results: ScrapeResult[];
    inflationRate: number;
    totalDividendsFound: number;
}

export interface NewsItem {
    id: string;
    title: string;
    summary: string;
    source: string;
    url: string;
    date: string;
    imageUrl?: string;
    category: 'FIIs' | 'Ações' | 'Macro' | 'Geral';
}