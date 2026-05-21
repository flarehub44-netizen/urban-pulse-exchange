-- region_id backfill + archive legacy seed markets without oracle

alter table public.markets
  add column if not exists archived boolean not null default false;

create index if not exists markets_catalog_active
  on public.markets (archived, status)
  where archived = false;

-- Map legacy region labels → regions.id
update public.markets set region_id = 'paulista'
where region_id is null and (
  id ilike '%paulista%' or region ilike '%Paulista%'
);

update public.markets set region_id = 'marginal'
where region_id is null and (
  id ilike '%marginal%' or id ilike '%tietê%' or region ilike '%Marginal%'
);

update public.markets set region_id = 'fariaLima'
where region_id is null and (
  id ilike '%faria%' or region ilike '%Faria Lima%'
);

update public.markets set region_id = 'pinheiros'
where region_id is null and (
  id ilike '%rebouças%' or id ilike '%23-maio%' or region ilike '%Rebouças%'
);

update public.markets set region_id = 'centro'
where region_id is null and (
  id ilike '%anhangabaú%' or region ilike '%Anhangabaú%'
);

update public.markets set region_id = 'vilaMariana'
where region_id is null and (
  id ilike '%brigadeiro%' or region ilike '%Brigadeiro%'
);

update public.markets set region_id = 'marginal'
where region_id is null and (
  id ilike '%imigrantes%' or region ilike '%Imigrantes%'
);

-- Archive pre-live seed slugs (duplicate catalog); keep *-live as source of truth
update public.markets
set
  archived = true,
  accept_bets = false,
  status = case
    when status in ('live', 'closing', 'closed', 'resolving', 'dispute') then 'settled'::market_status
    else status
  end,
  updated_at = now()
where id not like '%-live'
  and id in (
    'paulista-rush', 'marginal-tietê', 'faria-lima', '23-maio',
    'rebouças', 'anhangabaú', 'imigrantes', 'brigadeiro'
  );

-- Any other market still without region_id and not draft: archive to avoid void loop
update public.markets
set archived = true, accept_bets = false, updated_at = now()
where region_id is null
  and archived = false
  and status not in ('draft', 'settled', 'void', 'resolved');
