-- Admin RPCs: server-only via BFF (revoke browser EXECUTE for authenticated).
-- Admin UI calls src/actions/admin/* ServerFns; assert_admin() still runs inside each RPC.

do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as func
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and (
        p.proname like 'admin\_%'
        or p.proname like 'get_admin\_%'
        or p.proname = 'get_platform_settings_admin'
      )
  loop
    execute format('revoke execute on function %s from authenticated', r.func);
  end loop;
end
$$;

-- Re-grant service_role (default deny hardening may have left gaps).
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as func
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and (
        p.proname like 'admin\_%'
        or p.proname like 'get_admin\_%'
        or p.proname = 'get_platform_settings_admin'
      )
  loop
    execute format('grant execute on function %s to service_role', r.func);
  end loop;
end
$$;
