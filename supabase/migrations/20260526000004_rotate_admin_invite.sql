-- Rotates the hardcoded 'VIAX-OPS-2026' bootstrap invite code to a random value.
-- The original code was committed to the repository and must be invalidated.
-- After applying, retrieve the new code via:
--   select code from public.admin_invites where note like '%Bootstrap%' and used_by is null;
-- using service_role credentials from the Supabase dashboard.

update public.admin_invites
set code = upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 16)),
    note = 'Bootstrap operador — recuperar via service_role (código rotacionado)'
where code = 'VIAX-OPS-2026'
  and used_by is null;
