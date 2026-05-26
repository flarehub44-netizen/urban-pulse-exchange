-- Set immutable search_path on public functions missing it (Security Advisor 0011).

do $$
declare
  r record;
begin
  for r in
    select p.oid,
           n.nspname as schema_name,
           p.proname as name,
           pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and not exists (
        select 1
        from unnest(coalesce(p.proconfig, array[]::text[])) cfg
        where cfg like 'search_path=%'
      )
  loop
    execute format(
      'alter function %I.%I(%s) set search_path = public',
      r.schema_name,
      r.name,
      r.args
    );
  end loop;
end $$;
