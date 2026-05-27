-- Rebalance football pools:
-- 1) add one zero-like magnitude (x10) for existing pools
-- 2) ensure non-zero default for empty pools
-- 3) keep values "quebrados" (non-round) deterministically

update public.football_markets fm
set
  pool_home = case
    when coalesce(fm.pool_home, 0) <= 0
      then (10000 + (fm.fixture_id % 9000) + 37)::numeric
    else (fm.pool_home * 10 + ((fm.fixture_id * 3) % 97))::numeric
  end,
  pool_draw = case
    when coalesce(fm.pool_draw, 0) <= 0
      then (9000 + (fm.fixture_id % 7000) + 19)::numeric
    else (fm.pool_draw * 10 + ((fm.fixture_id * 5) % 89))::numeric
  end,
  pool_away = case
    when coalesce(fm.pool_away, 0) <= 0
      then (11000 + (fm.fixture_id % 8000) + 53)::numeric
    else (fm.pool_away * 10 + ((fm.fixture_id * 7) % 83))::numeric
  end
where fm.fixture_id is not null;

-- Explicit guarantee for São Paulo x Corinthians
update public.football_markets fm
set
  pool_home = 58321,
  pool_draw = 27419,
  pool_away = 31653
from public.football_fixtures ff
where ff.api_fixture_id = fm.fixture_id
  and lower(ff.home_team_name) like 'são paulo%'
  and lower(ff.away_team_name) like 'corinthians%';
