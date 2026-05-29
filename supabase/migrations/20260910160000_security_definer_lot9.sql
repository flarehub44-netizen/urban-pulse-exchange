-- Lot 9: revoke authenticated from internal cron-only football resolve surface.

do $$
begin
  if to_regprocedure('public.resolve_football_fixture(bigint)') is not null then
    execute 'revoke execute on function public.resolve_football_fixture(bigint) from authenticated';
    execute 'grant execute on function public.resolve_football_fixture(bigint) to service_role';
  end if;

  if to_regprocedure('public.list_football_markets_for_resolve()') is not null then
    execute 'revoke execute on function public.list_football_markets_for_resolve() from authenticated';
    execute 'grant execute on function public.list_football_markets_for_resolve() to service_role';
  end if;
end
$$;
