-- Partner payouts: in simulated mode, do not debit partner balance.

create or replace function public.partner_request_payout(p_amount numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_bal numeric;
  v_min numeric;
  v_real boolean;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  perform public.partner_release_mature_cpa(v_uid);

  v_min := public.partner_setting_num('min_payout_amount', 50);
  if p_amount < v_min then raise exception 'Minimum payout is %', v_min; end if;

  select coalesce(
    (select (value #>> '{}')::boolean from public.platform_settings where key = 'partner_payouts_real'),
    false
  ) into v_real;

  select balance into v_bal from public.partner_accounts where user_id = v_uid and status = 'active' for update;
  if not found then raise exception 'Not active partner'; end if;
  if v_bal < p_amount then raise exception 'Insufficient balance'; end if;

  if v_real then
    update public.partner_accounts set balance = balance - p_amount where user_id = v_uid;
  end if;

  insert into public.partner_payouts (partner_id, amount, status, method)
  values (
    v_uid,
    p_amount,
    case when v_real then 'pending' else 'simulated' end,
    case when v_real then 'pix' else 'simulated' end
  );

  return jsonb_build_object(
    'ok', true,
    'balance', case when v_real then (v_bal - p_amount) else v_bal end,
    'simulated', not v_real
  );
end;
$$;
