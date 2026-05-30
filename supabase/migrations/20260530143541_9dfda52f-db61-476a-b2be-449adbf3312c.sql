
-- E1: market_resolutions — hide inputs/payout_summary/validation
REVOKE SELECT ON public.market_resolutions FROM anon, authenticated;
GRANT SELECT (id, market_id, status, raw_value, derived_side, confidence, model_version, source, created_at)
  ON public.market_resolutions TO anon, authenticated;

-- football_market_resolutions — hide inputs/payout_summary
REVOKE SELECT ON public.football_market_resolutions FROM anon, authenticated;
GRANT SELECT (id, market_id, status, winning_outcome, goals_home, goals_away, source, created_at)
  ON public.football_market_resolutions TO anon, authenticated;

-- football_fixtures — hide raw_payload + moderation fields
REVOKE SELECT ON public.football_fixtures FROM anon, authenticated;
GRANT SELECT (api_fixture_id, api_league_id, season, kickoff_at, status_short,
              home_team_id, home_team_name, away_team_id, away_team_name,
              goals_home, goals_away, venue, review_status, synced_at, created_at,
              home_logo_url, away_logo_url, goals_home_ht, goals_away_ht, elapsed)
  ON public.football_fixtures TO anon, authenticated;

-- monthly_impact_winners — hide fulfillment metadata
REVOKE SELECT ON public.monthly_impact_winners FROM anon, authenticated;
GRANT SELECT (id, period_month, rank, user_id, xp_total, prize_label, created_at)
  ON public.monthly_impact_winners TO anon, authenticated;
