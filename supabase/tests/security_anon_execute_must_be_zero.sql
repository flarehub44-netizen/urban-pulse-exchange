-- Post-migration check: no SECURITY DEFINER function in public callable by anon.
-- Expected: 0 rows. Same query as Supabase Security Advisor lint anon_security_definer.

select count(*) as anon_count
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prokind = 'f'
  and p.prosecdef
  and has_function_privilege('anon', p.oid, 'EXECUTE');

-- Detail (should return no rows when healthy):
select p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prokind = 'f'
  and p.prosecdef
  and has_function_privilege('anon', p.oid, 'EXECUTE')
order by 1, 2;
