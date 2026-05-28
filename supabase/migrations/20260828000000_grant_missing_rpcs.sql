-- Re-grant RPCs accidentally omitted from the 20260826020000 allowlist.
-- complete_registration, casino_spin_status, get_trending_traders were revoked by
-- the blanket REVOKE in that migration but never added to the explicit allowlist.
grant execute on function public.complete_registration(text)   to authenticated;
grant execute on function public.casino_spin_status()          to authenticated;
grant execute on function public.get_trending_traders(integer) to authenticated, anon;
