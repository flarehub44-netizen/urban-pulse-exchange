-- Performance: index for recent bets per market (used by get_market_recent_bets / SocialBook)
CREATE INDEX IF NOT EXISTS bets_market_recent
  ON public.bets(market_id, created_at DESC);

-- Live score: elapsed minutes for in-progress football fixtures
ALTER TABLE public.football_fixtures
  ADD COLUMN IF NOT EXISTS elapsed int;

-- Extend upsert_football_fixture to accept and store elapsed minutes.
-- All existing params kept; p_elapsed added with default null for backwards compat.
CREATE OR REPLACE FUNCTION public.upsert_football_fixture(
  p_api_fixture_id bigint,
  p_api_league_id int,
  p_season int,
  p_kickoff_at timestamptz,
  p_status_short text,
  p_home_team_id int,
  p_home_team_name text,
  p_away_team_id int,
  p_away_team_name text,
  p_goals_home int,
  p_goals_away int,
  p_venue text default null,
  p_league_name text default null,
  p_league_country text default null,
  p_raw jsonb default '{}',
  -- Extended params added by later migrations (must remain last with defaults)
  p_home_logo_url text default null,
  p_away_logo_url text default null,
  p_goals_home_ht int default null,
  p_goals_away_ht int default null,
  p_elapsed int default null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.football_fixtures%rowtype;
  v_close_min int;
BEGIN
  INSERT INTO public.football_leagues (api_league_id, name, country, enabled)
  VALUES (
    p_api_league_id,
    COALESCE(p_league_name, 'League ' || p_api_league_id::text),
    COALESCE(p_league_country, ''),
    true
  )
  ON CONFLICT (api_league_id) DO UPDATE SET
    name = COALESCE(excluded.name, football_leagues.name),
    updated_at = now();

  SELECT * INTO v_existing FROM public.football_fixtures WHERE api_fixture_id = p_api_fixture_id;

  IF found AND v_existing.review_status = 'rejected' THEN
    RETURN jsonb_build_object('fixture_id', p_api_fixture_id, 'skipped', 'rejected');
  END IF;

  INSERT INTO public.football_fixtures (
    api_fixture_id, api_league_id, season, kickoff_at, status_short,
    home_team_id, home_team_name, away_team_id, away_team_name,
    goals_home, goals_away, venue, raw_payload, synced_at,
    review_status, elapsed
  ) VALUES (
    p_api_fixture_id, p_api_league_id, p_season, p_kickoff_at, p_status_short,
    p_home_team_id, p_home_team_name, p_away_team_id, p_away_team_name,
    p_goals_home, p_goals_away, p_venue, COALESCE(p_raw, '{}'), now(),
    CASE WHEN found THEN v_existing.review_status ELSE 'pending_review'::public.football_review_status END,
    p_elapsed
  )
  ON CONFLICT (api_fixture_id) DO UPDATE SET
    kickoff_at   = excluded.kickoff_at,
    status_short = excluded.status_short,
    goals_home   = COALESCE(excluded.goals_home, football_fixtures.goals_home),
    goals_away   = COALESCE(excluded.goals_away, football_fixtures.goals_away),
    elapsed      = COALESCE(excluded.elapsed,    football_fixtures.elapsed),
    venue        = COALESCE(excluded.venue,      football_fixtures.venue),
    raw_payload  = excluded.raw_payload,
    synced_at    = now();

  -- Update live markets betting state
  v_close_min := public.football_setting_num('football_betting_close_minutes', 5)::int;

  UPDATE public.football_markets fm
  SET
    betting_closes_at = f.kickoff_at - (v_close_min || ' minutes')::interval,
    accept_bets = CASE
      WHEN fm.status NOT IN ('live', 'closing') THEN false
      WHEN p_status_short IN ('FT', 'AET', 'PEN', 'CANC', 'ABD', 'AWD', 'WO', 'PST') THEN false
      WHEN now() >= f.kickoff_at - (v_close_min || ' minutes')::interval THEN false
      ELSE true
    END
  FROM public.football_fixtures f
  WHERE f.api_fixture_id = p_api_fixture_id
    AND fm.fixture_id = p_api_fixture_id;

  RETURN jsonb_build_object('fixture_id', p_api_fixture_id, 'ok', true);
END;
$$;
