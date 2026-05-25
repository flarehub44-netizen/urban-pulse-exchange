-- Fix RLS policy after partial apply of 20260710000002

drop policy if exists deposit_funnel_events_admin_select on public.deposit_funnel_events;

create policy deposit_funnel_events_admin_select on public.deposit_funnel_events
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );
