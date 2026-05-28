-- Phase 2 (lot 7): convert additional user-facing RPCs to SECURITY INVOKER
-- after adding the minimal RLS policies required for safe execution.

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'daily_missions'
      and policyname = 'daily_missions_read_authenticated'
  ) then
    create policy daily_missions_read_authenticated
      on public.daily_missions
      for select
      to authenticated
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
      and tablename = 'achievements'
      and policyname = 'achievements_read_authenticated'
  ) then
    create policy achievements_read_authenticated
      on public.achievements
      for select
      to authenticated
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
      and tablename = 'market_views'
      and policyname = 'market_views_update_own'
  ) then
    create policy market_views_update_own
      on public.market_views
      for update
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end
$$;

alter function public.get_daily_missions()
  security invoker;

alter function public.get_user_achievements(uuid)
  security invoker;

alter function public.record_market_view(text)
  security invoker;
