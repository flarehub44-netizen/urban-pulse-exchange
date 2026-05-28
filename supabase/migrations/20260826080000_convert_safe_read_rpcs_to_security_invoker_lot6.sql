-- Phase 2 (lot 6): convert read-only RPCs to SECURITY INVOKER where
-- underlying tables already have safe SELECT policies for authenticated users.

alter function public.get_active_events()
  security invoker;

alter function public.search_markets(text, integer)
  security invoker;

alter function public.list_traffic_ended_markets(integer)
  security invoker;
