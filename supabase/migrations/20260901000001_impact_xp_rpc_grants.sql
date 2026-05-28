-- Allowlist impact XP RPCs for authenticated clients (cron uses service_role).

grant execute on function public.get_monthly_impact_leaderboard(date, int) to authenticated, anon;
grant execute on function public.get_my_event_impact_summary() to authenticated;
grant execute on function public.admin_list_monthly_impact_winners(date) to authenticated;
grant execute on function public.admin_mark_impact_prize_fulfilled(uuid, text) to authenticated;
