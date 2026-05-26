-- Full-text search on markets: tsvector column + GIN index + search_markets RPC.
-- Language 'portuguese' uses Postgres built-in stemming for pt-BR.

alter table public.markets
  add column if not exists fts tsvector
    generated always as (
      to_tsvector('portuguese', coalesce(question, '') || ' ' || coalesce(region, ''))
    ) stored;

create index if not exists markets_fts_idx on public.markets using gin(fts);

-- RPC: search_markets — returns live/closing markets matching the query, ordered by recency.
create or replace function public.search_markets(p_query text, p_limit int default 8)
returns table (
  id       text,
  question text,
  region   text,
  status   market_status,
  pool_yes numeric,
  pool_no  numeric,
  ends_at  timestamptz
)
language sql stable security definer set search_path = public as $$
  select m.id, m.question, m.region, m.status, m.pool_yes, m.pool_no, m.ends_at
    from public.markets m
   where m.fts @@ plainto_tsquery('portuguese', p_query)
     and m.status in ('live', 'closing')
   order by m.ends_at asc
   limit p_limit;
$$;

revoke all on function public.search_markets(text, int) from public;
grant execute on function public.search_markets(text, int) to authenticated, anon;
