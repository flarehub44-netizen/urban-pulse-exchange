-- Fresh demo markets (does not delete settled history)
insert into public.markets (
  id, question, region, target, category, ends_at,
  pool_yes, pool_no, participants, trend,
  ai_side, ai_value, ai_confidence, status,
  accept_bets, region_id, resolution_metric, comparison_op, data_source,
  starts_at
) values
  (
    'paulista-rush-live', 'Mais de 5.200 carros na Paulista entre 18h–19h?',
    'Av. Paulista · SP', 5200, 'Fluxo', now() + interval '6 hours',
    42000, 18000, 120, 0.12, 'YES', 5300, 0.84, 'live',
    true, 'paulista', 'flow', 'gt', 'regions', now()
  ),
  (
    'marginal-tiete-live', 'Velocidade média na Marginal Tietê abaixo de 18 km/h às 19h?',
    'Marginal Tietê', 18, 'Velocidade', now() + interval '4 hours',
    28000, 32000, 95, -0.08, 'NO', 16, 0.72, 'live',
    true, 'marginal', 'avg_speed', 'lt', 'regions', now()
  ),
  (
    'faria-lima-live', 'Mais de 3.400 carros na Faria Lima entre 17h–18h?',
    'Faria Lima', 3400, 'Fluxo', now() + interval '3 hours',
    22000, 14000, 88, 0.15, 'YES', 3550, 0.78, 'closing',
    true, 'fariaLima', 'flow', 'gt', 'regions', now()
  ),
  (
    'reboucas-live', 'Velocidade média na Rebouças abaixo de 22 km/h às 19h?',
    'Av. Rebouças', 22, 'Velocidade', now() + interval '8 hours',
    12000, 9000, 54, 0.05, 'YES', 20, 0.68, 'live',
    true, 'pinheiros', 'avg_speed', 'lt', 'regions', now()
  ),
  (
    'brigadeiro-live', 'Mais de 2.100 carros na Brigadeiro entre 18h–19h?',
    'Av. Brigadeiro', 2100, 'Fluxo', now() + interval '2 hours',
    9000, 11000, 42, -0.04, 'NO', 2050, 0.63, 'closing',
    true, 'vilaMariana', 'flow', 'gt', 'regions', now()
  )
on conflict (id) do update set
  ends_at = excluded.ends_at,
  status = excluded.status,
  accept_bets = excluded.accept_bets,
  pool_yes = excluded.pool_yes,
  pool_no = excluded.pool_no,
  region_id = excluded.region_id,
  resolution_metric = excluded.resolution_metric,
  comparison_op = excluded.comparison_op,
  updated_at = now();

-- Probability history bootstrap for new markets
insert into public.market_history (market_id, p, recorded_at)
select
  m.id,
  greatest(0.05, least(0.95, m.pool_yes / nullif(m.pool_yes + m.pool_no, 0))),
  now() - (s.n * interval '2 minutes')
from public.markets m
cross join generate_series(0, 19) as s(n)
where m.id like '%-live'
  and not exists (
    select 1 from public.market_history h
    where h.market_id = m.id limit 1
  );
