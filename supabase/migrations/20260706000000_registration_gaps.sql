-- Payment withdrawal + admin users list: require formal registration

create or replace function public.request_withdrawal(
  p_amount  numeric,
  p_pix_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_profile profiles%rowtype;
  v_intent  uuid;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  if not public.is_user_registered(v_uid) then
    raise exception 'registration_required';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;
  if p_pix_key is null or length(trim(p_pix_key)) = 0 then
    raise exception 'Pix key is required';
  end if;

  select * into v_profile from public.profiles where id = v_uid for update;
  if not found then raise exception 'Profile not found'; end if;

  if p_amount > 100 and v_profile.kyc_status != 'approved' then
    raise exception 'kyc_required: complete identity verification to withdraw above 100 BRL';
  end if;

  if v_profile.balance < p_amount then raise exception 'Insufficient balance'; end if;

  update public.profiles
  set balance = balance - p_amount
  where id = v_uid;

  insert into public.payment_intents (user_id, type, amount, pix_key, status)
  values (v_uid, 'withdraw', p_amount, p_pix_key, 'pending')
  returning id into v_intent;

  insert into public.transactions (
    user_id, type, amount, market_label,
    before_balance, after_balance
  )
  values (
    v_uid, 'withdraw', p_amount, 'Saque Pix',
    v_profile.balance,
    v_profile.balance - p_amount
  );

  return jsonb_build_object('intent_id', v_intent, 'balance', v_profile.balance - p_amount);
end;
$$;

create or replace function public.get_admin_users_list()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_result jsonb;
begin
  perform public.assert_admin();
  select coalesce(jsonb_agg(row_to_json(x) order by x.volume desc nulls last), '[]'::jsonb) into v_result
  from (
    select p.id, p.username, p.balance, p.is_admin,
           coalesce(urp.kyc_status, 'none') as kyc_status,
           coalesce(urp.risk_score, 0) as risk_score,
           coalesce(urp.frozen, false) as frozen,
           coalesce(urp.bet_limit, null) as bet_limit,
           coalesce((select sum(stake) from public.bets b where b.user_id = p.id), 0) as volume,
           exists (
             select 1 from public.partner_accounts pa
             where pa.user_id = p.id and pa.status = 'active'
           ) as is_partner
    from public.profiles p
    left join public.user_risk_profiles urp on urp.user_id = p.id
    order by volume desc
    limit 200
  ) x;
  return v_result;
end;
$$;
