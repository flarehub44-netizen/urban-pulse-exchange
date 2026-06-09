-- Prediction platform taxonomy (Polymarket-style verticals + topics + collections)

do $$ begin
  create type public.market_vertical as enum (
    'transito', 'esportes', 'copa', 'politica', 'crypto', 'tech',
    'cultura', 'economia', 'geopolitica', 'comunidade'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.catalog_market_source as enum (
    'platform', 'football', 'prediction', 'community'
  );
exception when duplicate_object then null;
end $$;

-- Topic catalog (sidebar counts)
create table if not exists public.market_topic_catalog (
  slug      text primary key,
  label     text not null,
  vertical  public.market_vertical not null,
  sort_order int not null default 0
);

-- Assign topics to any market id (platform / football / prediction / community)
create table if not exists public.market_topic_assignments (
  market_id   text not null,
  source      public.catalog_market_source not null,
  topic_slug  text not null references public.market_topic_catalog(slug) on delete cascade,
  primary key (market_id, source, topic_slug)
);

create index if not exists market_topic_assignments_topic_idx
  on public.market_topic_assignments (topic_slug);

-- Curated hubs (copa-2026, eleicoes, etc.)
create table if not exists public.market_collections (
  slug      text primary key,
  title     text not null,
  vertical  public.market_vertical not null,
  config    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.market_topic_catalog enable row level security;
alter table public.market_topic_assignments enable row level security;
alter table public.market_collections enable row level security;

create policy market_topic_catalog_read on public.market_topic_catalog
  for select to anon, authenticated using (true);

create policy market_topic_assignments_read on public.market_topic_assignments
  for select to anon, authenticated using (true);

create policy market_collections_read on public.market_collections
  for select to anon, authenticated using (true);

-- Seed topics
insert into public.market_topic_catalog (slug, label, vertical, sort_order) values
  ('fluxo', 'Fluxo', 'transito', 1),
  ('velocidade', 'Velocidade', 'transito', 2),
  ('congestionamento', 'Congestionamento', 'transito', 3),
  ('evento-urbano', 'Evento', 'transito', 4),
  ('futebol', 'Futebol', 'esportes', 1),
  ('copa-2026', 'Copa 2026', 'copa', 1),
  ('grupos-copa', 'Grupos', 'copa', 2),
  ('props-copa', 'Props', 'copa', 3),
  ('eleicoes', 'Eleições', 'politica', 1),
  ('governo', 'Governo', 'politica', 2),
  ('bitcoin', 'Bitcoin', 'crypto', 1),
  ('ethereum', 'Ethereum', 'crypto', 2),
  ('up-down', 'Up / Down', 'crypto', 3),
  ('ia', 'IA', 'tech', 1),
  ('spacex', 'SpaceX', 'tech', 2),
  ('big-tech', 'Big Tech', 'tech', 3),
  ('entretenimento', 'Entretenimento', 'cultura', 1),
  ('esportes-cultura', 'Esportes', 'cultura', 2),
  ('selic', 'Selic', 'economia', 1),
  ('inflacao', 'Inflação', 'economia', 2),
  ('comunidade', 'Comunidade', 'comunidade', 1)
on conflict (slug) do nothing;

insert into public.market_collections (slug, title, vertical, config) values
  ('copa-2026', 'Copa do Mundo 2026', 'copa', '{"season": 2026, "league_ids": [1]}'::jsonb),
  ('copa-props', 'Props Copa 2026', 'copa', '{}'::jsonb),
  ('crypto-short', 'Crypto curto prazo', 'crypto', '{"interval_minutes": 15}'::jsonb)
on conflict (slug) do nothing;

-- Backfill topic assignments for existing platform markets by category
insert into public.market_topic_assignments (market_id, source, topic_slug)
select m.id, 'platform'::public.catalog_market_source,
  case m.category::text
    when 'Fluxo' then 'fluxo'
    when 'Velocidade' then 'velocidade'
    when 'Congestionamento' then 'congestionamento'
    else 'evento-urbano'
  end
from public.markets m
where coalesce(m.market_kind, 'platform') = 'platform'
  and coalesce(m.archived, false) = false
on conflict do nothing;

insert into public.market_topic_assignments (market_id, source, topic_slug)
select fm.id, 'football'::public.catalog_market_source, 'futebol'
from public.football_markets fm
where fm.status in ('live', 'closing', 'draft')
on conflict do nothing;
