
-- Tabela de Transações (Carteira do Usuário)
create table if not exists public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  ticker text not null,
  type text not null check (type in ('BUY', 'SELL')),
  quantity numeric not null,
  price numeric not null,
  date date not null,
  asset_type text default 'FII',
  created_at timestamp with time zone default now()
);

-- Tabela de Metadados dos Ativos (Scraper Cache)
create table if not exists public.ativos_metadata (
  ticker text primary key,
  type text,
  segment text,
  current_price numeric,
  pvp numeric,
  dy_12m numeric,
  pl numeric,
  vacancia numeric,
  valor_mercado text,
  roe numeric,
  liquidez text,
  updated_at timestamp with time zone default now()
);

-- Tabela de Histórico de Dividendos (Scraper Cache)
create table if not exists public.market_dividends (
  id uuid default gen_random_uuid() primary key,
  ticker text not null,
  type text not null, -- DIV, JCP, REND
  date_com date not null,
  payment_date date not null,
  rate numeric not null,
  created_at timestamp with time zone default now()
);

-- Índices para performance
create index if not exists idx_transactions_user on public.transactions(user_id);
create index if not exists idx_dividends_ticker on public.market_dividends(ticker);

-- Constraint única para evitar duplicidade de dividendos na tabela global
alter table public.market_dividends 
add constraint unique_dividend_entry 
unique (ticker, type, date_com, payment_date, rate);

-- Habilitar Row Level Security (RLS)
alter table public.transactions enable row level security;
alter table public.ativos_metadata enable row level security;
alter table public.market_dividends enable row level security;

-- Políticas de Segurança

-- Transactions: Usuário só vê suas próprias
create policy "Users can view own transactions" on public.transactions
  for select using (auth.uid() = user_id);

create policy "Users can insert own transactions" on public.transactions
  for insert with check (auth.uid() = user_id);

create policy "Users can update own transactions" on public.transactions
  for update using (auth.uid() = user_id);

create policy "Users can delete own transactions" on public.transactions
  for delete using (auth.uid() = user_id);

-- Metadata & Dividendos: Leitura pública (autenticada), Escrita aberta (ou restrita a service role em prod)
-- Para simplificar o app demo, permitimos leitura para todos autenticados
create policy "Authenticated users can view metadata" on public.ativos_metadata
  for select to authenticated using (true);

create policy "Authenticated users can view dividends" on public.market_dividends
  for select to authenticated using (true);

-- Permissões de Escrita (Scraper Serverless precisa de permissão)
-- Em produção idealmente usa-se Service Role Key, mas para simplificar:
create policy "Allow all updates on metadata" on public.ativos_metadata
  for all using (true);

create policy "Allow all updates on dividends" on public.market_dividends
  for all using (true);
