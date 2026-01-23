
-- CRIAÇÃO DA TABELA DE METADADOS DE ATIVOS (Scraper Data)
create table if not exists ativos_metadata (
  ticker text primary key,
  type text, -- 'FII' ou 'ACAO'
  segment text,
  
  -- Preço e Valuation
  current_price numeric,
  valor_mercado text, -- Texto pois pode vir com 'B' ou 'M'
  pvp numeric,
  pl numeric,
  vpa numeric,
  lpa numeric,
  ev_ebitda numeric,
  divida_liquida_ebitda numeric,
  
  -- Eficiência e Dividendos
  dy_12m numeric,
  roe numeric,
  margem_liquida numeric,
  margem_bruta numeric,
  cagr_receita numeric,
  cagr_lucro numeric,
  ultimo_rendimento numeric,
  
  -- Dados FIIs Específicos
  vacancia numeric,
  tipo_gestao text,
  patrimonio_liquido text,
  taxa_adm text,
  num_cotistas text,
  
  -- Gerais
  liquidez text, -- Texto para suportar formatação
  updated_at timestamptz default now()
);

-- CRIAÇÃO DA TABELA DE DIVIDENDOS (Histórico)
create table if not exists market_dividends (
  id uuid default gen_random_uuid() primary key,
  ticker text not null,
  type text, -- 'DIV', 'JCP', 'REND'
  date_com date,
  payment_date date,
  rate numeric,
  created_at timestamptz default now(),
  unique(ticker, type, date_com, payment_date, rate)
);

-- HABILITAR RLS (Row Level Security) - Opcional, mas recomendado
alter table ativos_metadata enable row level security;
alter table market_dividends enable row level security;

-- POLÍTICAS DE ACESSO PÚBLICO (Leitura para todos, Escrita apenas via Service Role/API)
create policy "Leitura pública de metadata" on ativos_metadata for select using (true);
create policy "Leitura pública de dividendos" on market_dividends for select using (true);

-- Índices para performance
create index if not exists idx_ativos_metadata_type on ativos_metadata(type);
create index if not exists idx_market_dividends_ticker on market_dividends(ticker);
