-- Allow authenticated users to set CPF on their profile (required for Pix).

create or replace function public.update_profile_cpf(p_cpf text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_digits text := public.normalize_cpf_digits(p_cpf);
begin
  if v_user_id is null then
    raise exception 'UNAUTHORIZED' using errcode = 'P0001';
  end if;

  if v_digits is null or not public.is_valid_cpf(v_digits) then
    raise exception 'CPF_INVALID' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.profiles p
    where regexp_replace(coalesce(p.cpf, ''), '\D', '', 'g') = v_digits
      and p.id <> v_user_id
  ) then
    raise exception 'CPF_ALREADY_USED' using errcode = 'P0001';
  end if;

  update public.profiles
  set cpf = v_digits
  where id = v_user_id;

  return jsonb_build_object('ok', true, 'cpf_last4', right(v_digits, 4));
end;
$$;

revoke all on function public.update_profile_cpf(text) from public;
grant execute on function public.update_profile_cpf(text) to authenticated;
