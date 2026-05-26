-- Grant RPC for public event banners + refresh expired demo event windows.

grant execute on function public.get_active_events() to anon, authenticated;

update public.platform_events
set
  starts_at = now(),
  ends_at = now() + interval '7 days'
where slug = 'semana-transito-sp'
  and ends_at < now();

update public.platform_events
set
  starts_at = now(),
  ends_at = now() + interval '3 days'
where slug = 'rodizio-municipal'
  and ends_at < now();
