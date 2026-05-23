
-- 1) Privilege escalation on profiles: block users from updating admin/system fields.
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND is_admin = true)
$$;

CREATE OR REPLACE FUNCTION public.profiles_block_privileged_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  is_caller_admin boolean := false;
BEGIN
  -- Service role / no auth context (e.g. server functions) bypasses.
  IF caller IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT is_admin INTO is_caller_admin FROM public.profiles WHERE id = caller;
  IF COALESCE(is_caller_admin, false) THEN
    RETURN NEW;
  END IF;

  -- Block changes to system / financial / admin fields by non-admin authenticated users.
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin
    OR NEW.balance IS DISTINCT FROM OLD.balance
    OR NEW.kyc_status IS DISTINCT FROM OLD.kyc_status
    OR NEW.pnl IS DISTINCT FROM OLD.pnl
    OR NEW.roi IS DISTINCT FROM OLD.roi
    OR NEW.xp IS DISTINCT FROM OLD.xp
    OR NEW.xp_to_next IS DISTINCT FROM OLD.xp_to_next
    OR NEW.division IS DISTINCT FROM OLD.division
    OR NEW.accuracy IS DISTINCT FROM OLD.accuracy
    OR NEW.streak IS DISTINCT FROM OLD.streak
    OR NEW.streak_freezes_left IS DISTINCT FROM OLD.streak_freezes_left
    OR NEW.streak_multiplier IS DISTINCT FROM OLD.streak_multiplier
    OR NEW.volume_24h IS DISTINCT FROM OLD.volume_24h
    OR NEW.recovery_mode IS DISTINCT FROM OLD.recovery_mode
    OR NEW.recovery_days_left IS DISTINCT FROM OLD.recovery_days_left
    OR NEW.email_bonus_claimed IS DISTINCT FROM OLD.email_bonus_claimed
    OR NEW.is_ai IS DISTINCT FROM OLD.is_ai
  THEN
    RAISE EXCEPTION 'Cannot modify privileged profile fields';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_block_privileged_updates_trg ON public.profiles;
CREATE TRIGGER profiles_block_privileged_updates_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_block_privileged_updates();

-- 2) market_views: restrict SELECT to own rows.
DROP POLICY IF EXISTS market_views_select_all ON public.market_views;
CREATE POLICY market_views_select_own
ON public.market_views
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 3) poll_votes: restrict SELECT to own rows.
DROP POLICY IF EXISTS poll_votes_select ON public.poll_votes;
DROP POLICY IF EXISTS poll_votes_select_all ON public.poll_votes;
CREATE POLICY poll_votes_select_own
ON public.poll_votes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 4) platform_ledger: admin-only SELECT.
DROP POLICY IF EXISTS platform_ledger_read_authenticated ON public.platform_ledger;
CREATE POLICY platform_ledger_read_admin
ON public.platform_ledger
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- 5) partner_leaderboard_snapshots: explicit deny for clients (server uses service role).
DROP POLICY IF EXISTS partner_leaderboard_snapshots_deny_all ON public.partner_leaderboard_snapshots;
CREATE POLICY partner_leaderboard_snapshots_deny_all
ON public.partner_leaderboard_snapshots
FOR ALL
TO authenticated, anon
USING (false)
WITH CHECK (false);

-- 6) user_referrals: explicit deny for client INSERT/UPDATE/DELETE/SELECT
--    (writes happen via service-role server functions).
DROP POLICY IF EXISTS user_referrals_deny_all ON public.user_referrals;
CREATE POLICY user_referrals_deny_all
ON public.user_referrals
FOR ALL
TO authenticated, anon
USING (false)
WITH CHECK (false);
