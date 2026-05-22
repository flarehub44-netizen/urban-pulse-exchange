-- Refresh demo *-live markets (respects settled/void immutability trigger).

update public.markets
set
  status = case
    when id in ('faria-lima-live', 'brigadeiro-live') then 'closing'::market_status
    else 'live'::market_status
  end,
  accept_bets = true,
  archived = false,
  frozen = false,
  ends_at = now() + case id
    when 'paulista-rush-live' then interval '12 hours'
    when 'marginal-tiete-live' then interval '10 hours'
    when 'faria-lima-live' then interval '4 hours'
    when 'reboucas-live' then interval '14 hours'
    when 'brigadeiro-live' then interval '3 hours'
    else interval '12 hours'
  end,
  starts_at = coalesce(starts_at, now()),
  updated_at = now()
where id like '%-live'
  and status not in ('settled', 'void');

-- Re-upsert catalog markets; skip immutable rows on conflict
insert into public.markets (
  id, question, region, target, category, ends_at,
  pool_yes, pool_no, participants, trend,
  ai_side, ai_value, ai_confidence, status,
  accept_bets, region_id, resolution_metric, comparison_op, data_source,
  starts_at
) values
  (
    'paulista-rush-live', 'Mais de 5.200 carros na Paulista entre 18h–19h?',
    'Av. Paulista · SP', 5200, 'Fluxo', now() + interval '12 hours',
    42000, 18000, 120, 0.12, 'YES', 5300, 0.84, 'live',
    true, 'paulista', 'flow', 'gt', 'regions', now()
  ),
  (
    'marginal-tiete-live', 'Velocidade média na Marginal Tietê abaixo de 18 km/h às 19h?',
    'Marginal Tietê', 18, 'Velocidade', now() + interval '10 hours',
    28000, 32000, 95, -0.08, 'NO', 16, 0.72, 'live',
    true, 'marginal', 'avg_speed', 'lt', 'regions', now()
  ),
  (
    'reboucas-live', 'Velocidade média na Rebouças abaixo de 22 km/h às 19h?',
    'Av. Rebouças', 22, 'Velocidade', now() + interval '14 hours',
    12000, 9000, 54, 0.05, 'YES', 20, 0.68, 'live',
    true, 'pinheiros', 'avg_speed', 'lt', 'regions', now()
  )
on conflict (id) do update set
  ends_at = excluded.ends_at,
  status = excluded.status,
  accept_bets = excluded.accept_bets,
  archived = false,
  updated_at = now()
where public.markets.status not in ('settled', 'void');

-- Fresh IDs when originals are settled (catalog accepts any non-archived id)
insert into public.markets (
  id, question, region, target, category, ends_at,
  pool_yes, pool_no, participants, trend,
  ai_side, ai_value, ai_confidence, status,
  accept_bets, region_id, resolution_metric, comparison_op, data_source,
  starts_at
)
select *
from (
  values
    (
      'backup-paulista-live', 'Mais de 5.200 carros na Paulista entre 18h–19h?',
      'Av. Paulista · SP', 5200, 'Fluxo'::market_category, now() + interval '12 hours',
      42000::numeric, 18000::numeric, 120, 0.12, 'YES'::bet_side, 5300, 0.84, 'live'::market_status,
      true, 'paulista', 'flow', 'gt', 'regions', now()
    ),
    (
      'backup-marginal-live', 'Velocidade média na Marginal Tietê abaixo de 18 km/h às 19h?',
      'Marginal Tietê', 18, 'Velocidade'::market_category, now() + interval '10 hours',
      28000::numeric, 32000::numeric, 95, -0.08, 'NO'::bet_side, 16, 0.72, 'live'::market_status,
      true, 'marginal', 'avg_speed', 'lt', 'regions', now()
    ),
    (
      'backup-reboucas-live', 'Velocidade média na Rebouças abaixo de 22 km/h às 19h?',
      'Av. Rebouças', 22, 'Velocidade'::market_category, now() + interval '14 hours',
      12000::numeric, 9000::numeric, 54, 0.05, 'YES'::bet_side, 20, 0.68, 'live'::market_status,
      true, 'pinheiros', 'avg_speed', 'lt', 'regions', now()
    )
) as v(
  id, question, region, target, category, ends_at,
  pool_yes, pool_no, participants, trend,
  ai_side, ai_value, ai_confidence, status,
  accept_bets, region_id, resolution_metric, comparison_op, data_source,
  starts_at
)
where (
  select count(*)::int
  from public.markets m
  where m.status in ('live', 'closing')
    and m.accept_bets = true
    and coalesce(m.archived, false) = false
) < 3
on conflict (id) do nothing;

insert into public.market_history (market_id, p, recorded_at)
select
  m.id,
  greatest(0.05, least(0.95, m.pool_yes / nullif(m.pool_yes + m.pool_no, 0))),
  now() - (s.n * interval '2 minutes')
from public.markets m
cross join generate_series(0, 19) as s(n)
where (m.id like '%-live' or m.id like 'backup-%-live')
  and m.status in ('live', 'closing')
  and not exists (
    select 1 from public.market_history h
    where h.market_id = m.id
    limit 1
  );

insert into public.platform_events (name, slug, description, starts_at, ends_at, badge_icon, xp_boost)
select
  'Semana do Trânsito SP',
  'semana-transito-sp',
  'XP bônus em mercados de Congestionamento. Mostre que você conhece as vias!',
  now(),
  now() + interval '7 days',
  '🚦',
  50
where not exists (
  select 1 from public.platform_events
  where now() between starts_at and ends_at
);
