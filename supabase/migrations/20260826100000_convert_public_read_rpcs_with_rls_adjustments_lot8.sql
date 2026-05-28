-- Phase 2 (lot 8): convert public read RPCs to SECURITY INVOKER with minimal
-- RLS adjustment for scheduler metadata.

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'traffic_scheduler'
      and policyname = 'traffic_scheduler_read_authenticated'
  ) then
    create policy traffic_scheduler_read_authenticated
      on public.traffic_scheduler
      for select
      to authenticated
      using (true);
  end if;
end
$$;

alter function public.get_traffic_public_state()
  security invoker;

alter function public.list_public_community_markets(integer)
  security invoker;
