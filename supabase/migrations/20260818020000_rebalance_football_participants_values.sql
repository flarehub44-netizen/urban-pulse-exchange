-- Rebalance football participants:
-- 1) raise participant counts for better event realism
-- 2) keep non-rounded values (quebrados) deterministically

update public.football_markets fm
set participants = case
  when coalesce(fm.participants, 0) <= 0
    then 87 + (fm.fixture_id % 140)
  else greatest(77, (fm.participants * 10) + ((fm.fixture_id * 11) % 29))
end
where fm.fixture_id is not null;

-- Explicit guarantee for São Paulo x Corinthians
update public.football_markets fm
set participants = 417
from public.football_fixtures ff
where ff.api_fixture_id = fm.fixture_id
  and lower(ff.home_team_name) like 'são paulo%'
  and lower(ff.away_team_name) like 'corinthians%';
