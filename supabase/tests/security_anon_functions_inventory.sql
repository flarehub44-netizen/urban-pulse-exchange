-- Inventory: SECURITY DEFINER functions callable by anon (run after migrations).
-- Expected: only intentionally public RPCs (flags, social proof, partner tracking, etc.).

select
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as args,
  p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join lateral (
  select bool_or(has_function_privilege('anon', p.oid, 'execute')) as anon_exec
) priv on true
where n.nspname = 'public'
  and p.prokind = 'f'
  and priv.anon_exec
order by 1, 2;
