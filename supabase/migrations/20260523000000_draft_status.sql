alter type public.market_status add value if not exists 'draft';

alter table public.markets
  add column if not exists resolution_rule jsonb not null default '{}';
