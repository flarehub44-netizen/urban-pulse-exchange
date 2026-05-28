-- Restore public (anon) access removed by 20260826020000 hardening.
-- get_traffic_public_state is SECURITY INVOKER (lot 8) — needs RLS for anon on
-- tables the function reads. track_deposit_funnel_event stays SECURITY DEFINER.

grant execute on function public.get_traffic_public_state() to anon, authenticated;

grant execute on function public.track_deposit_funnel_event(text, jsonb, text)
  to anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'traffic_scheduler'
      and policyname = 'traffic_scheduler_read_anon'
  ) then
    create policy traffic_scheduler_read_anon
      on public.traffic_scheduler
      for select
      to anon
      using (true);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'market_resolutions'
      and policyname = 'market_resolutions_read_anon'
  ) then
    create policy market_resolutions_read_anon
      on public.market_resolutions
      for select
      to anon
      using (true);
  end if;
end
$$;
