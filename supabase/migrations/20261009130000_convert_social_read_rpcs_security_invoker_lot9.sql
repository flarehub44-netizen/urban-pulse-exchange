-- Lot 9: social / copy-trading read RPCs → SECURITY INVOKER + RLS.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'bets'
      and policyname = 'bets_public_active_read'
  ) then
    create policy bets_public_active_read on public.bets
      for select to authenticated
      using (
        payout is null
        and created_at < now() - interval '5 minutes'
        and exists (
          select 1 from public.markets m
          where m.id = bets.market_id
            and m.status in ('live', 'closing')
        )
      );
  end if;
end
$$;

alter function public.get_public_active_bets(uuid) security invoker;
alter function public.get_following_active_bets() security invoker;

-- get_public_trader_bets: public social proof on settled bets
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'get_public_trader_bets'
  ) then
    execute 'alter function public.get_public_trader_bets(uuid) security invoker';
  end if;
end
$$;
