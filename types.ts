
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

export interface RealEstateProperty {
  name: string;
  location?: string;
  type?: string;
}

export interface AssetFundamentals {
  // Comuns
  company_name?: string; // Razão Social
  cnpj?: string;
  p_vp?: number;
  p_l?: number;
  dy_12m?: number;
  roe?: number;
  liquidity?: string; // Liquidez Média Diária
  market_cap?: string; // Valor de Mercado
  
  // Rentabilidade (Novos Campos da Tabela)
  profitability_month?: number;
  profitability_real_month?: number;
  profitability_3m?: number;
  profitability_real_3m?: number;
  profitability_12m?: number;
  profitability_real_12m?: number;
  profitability_2y?: number;
  profitability_real_2y?: number;
  
  // Benchmarks (Comparação)
  benchmark_cdi_12m?: number;
  benchmark_ifix_12m?: number;
  benchmark_ibov_12m?: number;
  
  // Ações - Eficiência e Crescimento
  net_margin?: number;
  gross_margin?: number;
  ebit_margin?: number;
  cagr_revenue?: number;
  cagr_profits?: number;
  payout?: number;
  lpa?: number;
  vpa?: number;
  
  // Ações - Dívida e Valuation
  ev_ebitda?: number;
  net_debt_ebitda?: number;
  net_debt_equity?: number;

  // FIIs - Informações Gerais (Do Print)
  target_audience?: string; // Público Alvo
  mandate?: string; // Mandato
  segment_secondary?: string; // Segmento
  fund_type?: string; // Tipo de Fundo (Tijolo/Papel)
  duration?: string; // Prazo de Duração
  manager_type?: string; // Tipo de Gestão
  management_fee?: string; // Taxa de Administração
  vacancy?: number; // Vacância
  num_quotas?: string; // Cotas Emitidas (Número Total)
  assets_value?: string; // Valor Patrimonial (Total)
  properties_count?: number; // Número de Cotistas ou Imóveis
  last_dividend?: number; // Último Rendimento
  
  // Lista de Imóveis (FIIs de Tijolo)
  properties?: RealEstateProperty[];

  updated_at?: string;
  
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

// --- TIPOS DE MERCADO ---

export interface MarketAsset {
    ticker: string;
    name: string;
    price: number;
    variation_percent?: number;
    dy_12m?: number;
    p_vp?: number;
    p_l?: number;
    roe?: number;
    net_margin?: number;
    cagr_revenue?: number;
    liquidity?: number;
}

export interface MarketOverview {
    market_status: string;
    last_update: string;
    highlights: {
        fiis: {
            gainers: MarketAsset[];
            losers: MarketAsset[];
            high_yield: MarketAsset[];
            discounted: MarketAsset[];
            raw?: MarketAsset[];
        };
        stocks: {
            gainers: MarketAsset[];
            losers: MarketAsset[];
            high_yield: MarketAsset[];
            discounted: MarketAsset[];
            raw?: MarketAsset[];
        };
    };
    error?: boolean;
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

export type NewsSentiment = 'positive' | 'negative' | 'neutral';
export type NewsImpact = 'high' | 'normal' | 'risk';

export interface NewsItem {
    id: string;
    title: string;
    summary: string;
    source: string;
    url: string;
    date: string;
    imageUrl?: string;
    category: 'FIIs' | 'Ações' | 'Macro' | 'Geral';
    sentiment?: NewsSentiment;
    impact?: NewsImpact;
}

// --- TIPOS DE INTELIGÊNCIA ---
export type InsightType = 'opportunity' | 'warning' | 'neutral' | 'success' | 'news' | 'volatility_up' | 'volatility_down';

export interface PortfolioInsight {
    id: string;
    type: InsightType;
    title: string;
    message: string;
    relatedTicker?: string;
    actionLabel?: string;
    score: number; // 0 a 100, usado para prioridade
    timestamp?: number; // Para controle de expiração
    url?: string; // Link para notícia
    imageUrl?: string; // Imagem da notícia
}
