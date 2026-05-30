
-- 1) Mission XP replay: restrict user_mission_progress RLS to SELECT only.
DROP POLICY IF EXISTS user_mission_progress_own ON public.user_mission_progress;
CREATE POLICY user_mission_progress_read
  ON public.user_mission_progress
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 2) market_resolutions: tighten broad SELECT policies; grant SELECT only on safe columns.
DROP POLICY IF EXISTS market_resolutions_read_anon ON public.market_resolutions;
DROP POLICY IF EXISTS market_resolutions_read_authenticated ON public.market_resolutions;

REVOKE SELECT ON public.market_resolutions FROM anon, authenticated;
GRANT SELECT (id, market_id, status, raw_value, derived_side, confidence, model_version, source, validation, created_at)
  ON public.market_resolutions TO anon, authenticated;

CREATE POLICY market_resolutions_read_safe_cols
  ON public.market_resolutions
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 3) football_market_resolutions: same treatment (exclude inputs, payout_summary).
DROP POLICY IF EXISTS football_resolutions_read ON public.football_market_resolutions;
DROP POLICY IF EXISTS football_resolutions_read_authenticated ON public.football_market_resolutions;

REVOKE SELECT ON public.football_market_resolutions FROM anon, authenticated;
GRANT SELECT (id, market_id, status, winning_outcome, goals_home, goals_away, source, created_at)
  ON public.football_market_resolutions TO authenticated;

CREATE POLICY football_resolutions_read_safe_cols
  ON public.football_market_resolutions
  FOR SELECT
  TO authenticated
  USING (true);

-- 4) platform_ledger: standardize on is_current_user_admin().
DROP POLICY IF EXISTS platform_ledger_read_admin ON public.platform_ledger;
CREATE POLICY platform_ledger_read_admin
  ON public.platform_ledger
  FOR SELECT
  TO authenticated
  USING (public.is_current_user_admin());

-- 5) community-covers bucket: explicit SELECT policy so reads are documented (bucket is public by design).
CREATE POLICY community_covers_select
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'community-covers');
