-- Restaura EXECUTE para authenticated em RPCs admin revogadas por 20260826020000.
-- Segurança: cada função continua com assert_admin() / football_assert_admin() no corpo.

do $$
declare
  r record;
begin
  for r in
    select
      n.nspname as schema_name,
      p.proname as func_name,
      pg_get_function_identity_arguments(p.oid) as identity_args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef = true
      and (
        p.proname like 'admin\_%' escape '\'
        or p.proname like 'get_admin\_%' escape '\'
      )
  loop
    execute format(
      'grant execute on function %I.%I(%s) to authenticated',
      r.schema_name,
      r.func_name,
      r.identity_args
    );
  end loop;
end
$$;
