-- 1. Lock search_path for helper functions (warnings)
ALTER FUNCTION public.division_for_xp(integer) SET search_path = public;
ALTER FUNCTION public.guard_market_mutation() SET search_path = public;
ALTER FUNCTION public.is_allowed_stream_url(text) SET search_path = public;
ALTER FUNCTION public.min_minority_ratio() SET search_path = public;
ALTER FUNCTION public.min_oracle_confidence() SET search_path = public;
ALTER FUNCTION public.oracle_derive_side(numeric, numeric, text) SET search_path = public;
ALTER FUNCTION public.oracle_raw_metric(text, integer, numeric, numeric) SET search_path = public;
ALTER FUNCTION public.streak_xp_multiplier(integer) SET search_path = public;
ALTER FUNCTION public.trg_partner_parent_depth() SET search_path = public;
ALTER FUNCTION public.validate_market_pools(numeric, numeric, bet_side) SET search_path = public;

-- 2. Recreate leaderboard view as security_invoker (caller-scoped RLS)
ALTER VIEW public.leaderboard SET (security_invoker = true);