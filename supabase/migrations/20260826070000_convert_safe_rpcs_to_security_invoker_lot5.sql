-- Phase 2 (lot 5): convert additional user-scoped RPCs to SECURITY INVOKER.
-- Backing tables already enforce ownership via RLS for authenticated callers.

alter function public.toggle_trader_follow(uuid)
  security invoker;

alter function public.user_has_deposited()
  security invoker;

alter function public.get_my_leagues()
  security invoker;

alter function public.list_my_community_markets()
  security invoker;
