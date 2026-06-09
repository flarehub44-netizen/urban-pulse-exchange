
-- 1) Block non-admin users from updating privileged profile columns
CREATE OR REPLACE FUNCTION public.prevent_profile_privileged_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin_caller boolean;
BEGIN
  -- service_role / superuser bypass via SECURITY DEFINER trigger context: only enforce for authenticated end users
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT public.is_current_user_admin() INTO is_admin_caller;
  IF is_admin_caller THEN
    RETURN NEW;
  END IF;

  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin
     OR NEW.kyc_status IS DISTINCT FROM OLD.kyc_status
     OR NEW.balance IS DISTINCT FROM OLD.balance
     OR NEW.xp IS DISTINCT FROM OLD.xp
     OR NEW.xp_to_next IS DISTINCT FROM OLD.xp_to_next
     OR NEW.division IS DISTINCT FROM OLD.division
     OR NEW.recovery_mode IS DISTINCT FROM OLD.recovery_mode
     OR NEW.recovery_days_left IS DISTINCT FROM OLD.recovery_days_left
     OR NEW.banned_at IS DISTINCT FROM OLD.banned_at
     OR NEW.ban_reason IS DISTINCT FROM OLD.ban_reason
     OR NEW.account_kind IS DISTINCT FROM OLD.account_kind
     OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
     OR NEW.is_ai IS DISTINCT FROM OLD.is_ai
  THEN
    RAISE EXCEPTION 'Cannot modify privileged profile columns directly'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_privileged_updates ON public.profiles;
CREATE TRIGGER trg_prevent_profile_privileged_updates
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privileged_updates();

-- 2) platform_events insert: use is_current_user_admin() instead of inline profiles.is_admin check
DROP POLICY IF EXISTS events_insert ON public.platform_events;
CREATE POLICY events_insert ON public.platform_events
FOR INSERT
TO authenticated
WITH CHECK (public.is_current_user_admin());

-- 3) Revoke column-level SELECT on sensitive resolution internals
REVOKE SELECT (inputs, payout_summary) ON public.market_resolutions FROM anon, authenticated;
REVOKE SELECT (inputs, payout_summary) ON public.football_market_resolutions FROM anon, authenticated;

-- 4) Restrict monthly_impact_winners reads to authenticated only
DROP POLICY IF EXISTS monthly_impact_winners_select_all ON public.monthly_impact_winners;
CREATE POLICY monthly_impact_winners_select_authenticated ON public.monthly_impact_winners
FOR SELECT
TO authenticated
USING (true);
REVOKE SELECT ON public.monthly_impact_winners FROM anon;
