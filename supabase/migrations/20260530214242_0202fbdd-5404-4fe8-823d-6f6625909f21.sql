-- Permitir que RPCs SECURITY DEFINER (update_profile_cpf, request_withdrawal, etc.)
-- atualizem campos protegidos via bypass viax.progression='on'.
CREATE OR REPLACE FUNCTION public.profiles_block_privileged_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  caller uuid := auth.uid();
  is_caller_admin boolean := false;
  bypass text := current_setting('viax.progression', true);
begin
  -- Bypass for trusted internal RPCs
  if bypass = 'on' then return new; end if;
  if caller is null then return new; end if;

  select is_admin into is_caller_admin from public.profiles where id = caller;
  if coalesce(is_caller_admin, false) then return new; end if;

  if new.is_admin is distinct from old.is_admin
    or new.balance is distinct from old.balance
    or new.kyc_status is distinct from old.kyc_status
    or new.cpf is distinct from old.cpf
    or new.phone is distinct from old.phone
    or new.banned_at is distinct from old.banned_at
    or new.ban_reason is distinct from old.ban_reason
    or new.pnl is distinct from old.pnl or new.roi is distinct from old.roi
    or new.xp is distinct from old.xp or new.xp_to_next is distinct from old.xp_to_next
    or new.division is distinct from old.division or new.accuracy is distinct from old.accuracy
    or new.streak is distinct from old.streak
    or new.streak_freezes_left is distinct from old.streak_freezes_left
    or new.streak_multiplier is distinct from old.streak_multiplier
    or new.volume_24h is distinct from old.volume_24h
    or new.recovery_mode is distinct from old.recovery_mode
    or new.recovery_days_left is distinct from old.recovery_days_left
    or new.email_bonus_claimed is distinct from old.email_bonus_claimed
    or new.is_ai is distinct from old.is_ai
  then
    raise exception 'Cannot modify privileged profile fields';
  end if;

  return new;
end;
$$;

-- update_profile_cpf: ativar GUC de bypass antes do UPDATE
CREATE OR REPLACE FUNCTION public.update_profile_cpf(p_cpf text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_user_id uuid := auth.uid();
  v_digits text := public.normalize_cpf_digits(p_cpf);
begin
  if v_user_id is null then
    raise exception 'UNAUTHORIZED' using errcode = 'P0001';
  end if;

  perform public.assert_user_account_active(v_user_id);

  if v_digits is null or not public.is_valid_cpf(v_digits) then
    raise exception 'CPF_INVALID' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.profiles p
    where regexp_replace(coalesce(p.cpf, ''), '\D', '', 'g') = v_digits
      and p.id <> v_user_id
  ) then
    raise exception 'CPF_ALREADY_USED' using errcode = 'P0001';
  end if;

  perform set_config('viax.progression', 'on', true);
  update public.profiles set cpf = v_digits where id = v_user_id;

  return jsonb_build_object('ok', true, 'cpf_last4', right(v_digits, 4));
end;
$$;