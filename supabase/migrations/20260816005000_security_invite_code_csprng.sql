-- Replace predictable MD5-based invite code with a CSPRNG token (gen_random_bytes via pgcrypto).
-- MD5(uuid || now()) is deterministic given the partner UUID and timestamp — use true randomness instead.

create or replace function public.get_partner_sub_affiliates()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_code text;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;

  if not exists (
    select 1 from public.partner_accounts
    where user_id = v_uid and status = 'active' and sub_creators_enabled = true
  ) then
    raise exception 'Sub-creators not enabled for this partner';
  end if;

  select sub_invite_code into v_code from public.partner_accounts where user_id = v_uid;
  if v_code is null then
    v_code := upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 8));
    update public.partner_accounts set sub_invite_code = v_code where user_id = v_uid;
  end if;

  return jsonb_build_object(
    'invite_code', v_code,
    'subs', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', pa.user_id, 'slug', pa.slug, 'tier', pa.tier, 'balance', pa.balance
      ))
      from public.partner_accounts pa where pa.parent_partner_id = v_uid
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.get_partner_sub_affiliates() to authenticated;
