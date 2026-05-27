-- Participants should follow pooled liquidity:
-- participants = round((pool_home + pool_draw + pool_away) / 50)

update public.football_markets fm
set participants = greatest(
  1,
  round(
    (
      coalesce(fm.pool_home, 0) +
      coalesce(fm.pool_draw, 0) +
      coalesce(fm.pool_away, 0)
    ) / 50.0
  )::int
)
where fm.fixture_id is not null;
