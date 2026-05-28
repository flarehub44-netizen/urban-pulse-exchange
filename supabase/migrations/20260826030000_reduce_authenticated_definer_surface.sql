-- Phase 2 (safe subset): reduce authenticated EXECUTE on internal SECURITY DEFINER RPCs.
-- Keep service_role access for backend jobs and server-side integrations.

revoke execute on function public.assert_user_account_active(uuid) from authenticated;
grant execute on function public.assert_user_account_active(uuid) to service_role;

revoke execute on function public.apply_user_progress(uuid, text, integer) from authenticated;
grant execute on function public.apply_user_progress(uuid, text, integer) to service_role;

revoke execute on function public.check_user_achievements(uuid) from authenticated;
grant execute on function public.check_user_achievements(uuid) to service_role;

revoke execute on function public.is_admin(uuid) from authenticated;
grant execute on function public.is_admin(uuid) to service_role;

revoke execute on function public.upsert_football_fixture(
  bigint, integer, integer, timestamptz, text, integer, text, integer, text,
  integer, integer, text, text, text, jsonb, text, text, integer, integer
) from authenticated;
grant execute on function public.upsert_football_fixture(
  bigint, integer, integer, timestamptz, text, integer, text, integer, text,
  integer, integer, text, text, text, jsonb, text, text, integer, integer
) to service_role;

revoke execute on function public.upsert_football_fixture(
  bigint, integer, integer, timestamptz, text, integer, text, integer, text,
  integer, integer, text, text, text, jsonb, text, text, integer, integer, integer
) from authenticated;
grant execute on function public.upsert_football_fixture(
  bigint, integer, integer, timestamptz, text, integer, text, integer, text,
  integer, integer, text, text, text, jsonb, text, text, integer, integer, integer
) to service_role;

revoke execute on function public.cron_close_football_bets() from authenticated;
grant execute on function public.cron_close_football_bets() to service_role;

revoke execute on function public.list_football_markets_for_resolve() from authenticated;
grant execute on function public.list_football_markets_for_resolve() to service_role;

revoke execute on function public.resolve_football_fixture(bigint) from authenticated;
grant execute on function public.resolve_football_fixture(bigint) to service_role;
