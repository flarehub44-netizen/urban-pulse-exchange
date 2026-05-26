-- Revoke default PUBLIC execute on API-exposed functions (Security Advisor 0028/0029).
-- Role-specific grants from prior migrations remain intact.

do $$
declare
  r record;
begin
  for r in
    select pg_get_function_identity_arguments(p.oid) as args,
           p.proname as name,
           n.nspname as schema_name
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
  loop
    execute format(
      'revoke all on function %I.%I(%s) from public',
      r.schema_name,
      r.name,
      r.args
    );
  end loop;
end $$;
