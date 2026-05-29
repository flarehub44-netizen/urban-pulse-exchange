-- Admin MFA: optional AAL2 enforcement via platform_settings.admin_mfa_required.

insert into public.platform_settings (key, value) values
  ('admin_mfa_required', 'false'::jsonb)
on conflict (key) do nothing;

create or replace function public.is_admin_mfa_required()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select (value #>> '{}')::boolean from public.platform_settings where key = 'admin_mfa_required'),
    false
  );
$$;

revoke execute on function public.is_admin_mfa_required() from public;
grant execute on function public.is_admin_mfa_required() to authenticated, service_role;

create or replace function public.assert_admin_mfa()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_mfa_required() then
    return;
  end if;

  if coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception 'admin_mfa_required: autenticação de dois fatores obrigatória para esta ação';
  end if;
end;
$$;

revoke execute on function public.assert_admin_mfa() from public;
grant execute on function public.assert_admin_mfa() to authenticated, service_role;

create or replace function public.assert_admin()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin boolean;
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  select coalesce(is_admin, false) into v_admin from public.profiles where id = auth.uid();
  if not v_admin then raise exception 'Admin only'; end if;
  perform public.assert_admin_mfa();
end;
$$;
