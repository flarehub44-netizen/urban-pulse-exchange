-- Inventário de funções SECURITY DEFINER sem search_path explícita.
-- Esperado: zero linhas.

select
  n.nspname as schema_name,
  p.proname as function_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.prosecdef = true
  and n.nspname not in ('pg_catalog', 'information_schema')
  and not exists (
    select 1
    from unnest(coalesce(p.proconfig, '{}'::text[])) as cfg(setting)
    where cfg.setting like 'search_path=%'
  )
order by n.nspname, p.proname;
