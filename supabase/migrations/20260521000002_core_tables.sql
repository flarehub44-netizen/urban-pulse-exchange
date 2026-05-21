-- profiles — one row per auth.users UUID, auto-created by trigger on sign-in
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text not null default 'Usuário ViaX',
  handle        text not null unique,
  avatar        text not null,
  division      division_tier not null default 'Bronze',
  balance       numeric(12,2) not null default 1000.00 check (balance >= 0),
  xp            int not null default 0,
  xp_to_next    int not null default 2000,
  streak        int not null default 0,
  accuracy      numeric(5,4) not null default 0.5,
  roi           numeric(7,4) not null default 0.0,
  pnl           numeric(12,2) not null default 0.0,
  volume_24h    numeric(12,2) not null default 0.0,
  city          text not null default 'São Paulo',
  neighborhood  text not null default '',
  is_ai         boolean not null default false,
  created_at    timestamptz not null default now()
);

-- markets — slug as PK, pools updated only via place_bet RPC
create table public.markets (
  id            text primary key,
  question      text not null,
  region        text not null,
  target        numeric not null,
  category      market_category not null,
  ends_at       timestamptz not null,
  pool_yes      numeric(14,2) not null default 0 check (pool_yes >= 0),
  pool_no       numeric(14,2) not null default 0 check (pool_no >= 0),
  participants  int not null default 0,
  trend         numeric(4,3) not null default 0 check (trend between -1 and 1),
  ai_side       bet_side not null default 'YES',
  ai_value      numeric not null,
  ai_confidence numeric(4,3) not null check (ai_confidence between 0 and 1),
  status        market_status not null default 'live',
  resolved      bet_side,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- market_history — probability snapshots fed by trigger on pool changes
create table public.market_history (
  id          bigserial primary key,
  market_id   text not null references public.markets(id) on delete cascade,
  p           numeric(6,5) not null,
  recorded_at timestamptz not null default now()
);
create index on public.market_history(market_id, recorded_at desc);

-- bets — one row per user bet
create table public.bets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  market_id  text not null references public.markets(id) on delete cascade,
  side       bet_side not null,
  stake      numeric(12,2) not null check (stake > 0),
  share      numeric(10,8),
  payout     numeric(12,2),
  created_at timestamptz not null default now()
);
create index on public.bets(user_id, created_at desc);
create index on public.bets(market_id, side);

-- transactions — financial ledger per user
create table public.transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  type         tx_type not null,
  market_id    text references public.markets(id) on delete set null,
  market_label text,
  amount       numeric(12,2) not null check (amount > 0),
  created_at   timestamptz not null default now()
);
create index on public.transactions(user_id, created_at desc);

-- feed_posts — social feed
create table public.feed_posts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  text       text not null check (char_length(text) between 1 and 280),
  market_id  text references public.markets(id) on delete set null,
  tag        feed_tag,
  likes      int not null default 0,
  comments   int not null default 0,
  reposts    int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.feed_posts(created_at desc);
create index on public.feed_posts(market_id, created_at desc);

-- notifications — per-user alerts
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  kind       notif_kind not null,
  text       text not null,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.notifications(user_id, read, created_at desc);

-- regions — static geometry + live telemetry
create table public.regions (
  id         text primary key,
  name       text not null,
  congestion numeric(4,3) not null default 0.5 check (congestion between 0 and 1),
  flow       int not null default 2000,
  avg_speed  numeric(5,2) not null default 25,
  x          numeric(5,2) not null,
  y          numeric(5,2) not null,
  r          numeric(4,2) not null,
  updated_at timestamptz not null default now()
);
