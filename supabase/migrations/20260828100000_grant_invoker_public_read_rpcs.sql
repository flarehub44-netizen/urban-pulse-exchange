-- Restore EXECUTE for SECURITY INVOKER read RPCs used without login (anon).
-- 20260826020000 revoked these while they were still SECURITY DEFINER; the
-- allowlist only re-granted authenticated. Public BFF/server paths call them
-- with the publishable (anon) key — e.g. getActiveEventsFn.

grant execute on function public.get_active_events() to anon, authenticated;

grant execute on function public.search_markets(text, integer) to anon, authenticated;

grant execute on function public.list_traffic_ended_markets(integer) to anon, authenticated;
