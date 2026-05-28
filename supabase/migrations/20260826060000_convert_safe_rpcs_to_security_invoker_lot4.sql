-- Phase 2 (lot 4): convert safe user-scoped RPCs from SECURITY DEFINER to SECURITY INVOKER.
-- RLS policies already enforce ownership for both backing tables.

alter function public.get_following_trader_ids()
  security invoker;

alter function public.get_recent_near_miss()
  security invoker;
