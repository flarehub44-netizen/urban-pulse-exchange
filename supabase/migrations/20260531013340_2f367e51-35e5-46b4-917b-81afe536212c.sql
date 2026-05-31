-- Allow official platform RPCs to update protected wallet/profile financial columns
-- while keeping direct client/table updates blocked by guard_profiles_sensitive_columns().

create or replace function public.wallet_deposit(p_amount numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_tx_id uuid;
  v_balance_after numeric;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;
  if p_amount > 500000 then raise exception 'Amount exceeds limit'; end if;

  perform set_config('viax.progression', 'on', true);

  update public.profiles
  set
    balance = balance + p_amount,
    first_deposit_at = coalesce(first_deposit_at, now())
  where id = v_uid
  returning balance into v_balance_after;

  perform set_config('viax.progression', 'off', true);

  insert into public.transactions (
    user_id, type, amount, market_label,
    before_balance, after_balance
  )
  values (
    v_uid, 'deposit', p_amount, 'Carteira',
    v_balance_after - p_amount,
    v_balance_after
  )
  returning id into v_tx_id;

  perform public.maybe_pay_partner_cpa(v_uid, p_amount);

  return jsonb_build_object('tx_id', v_tx_id, 'balance', v_balance_after);
exception
  when others then
    perform set_config('viax.progression', 'off', true);
    raise;
end;
$$;

create or replace function public.wallet_withdraw(p_amount numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile profiles%rowtype;
  v_tx_id uuid;
  v_balance_after numeric;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  select * into v_profile
  from public.profiles
  where id = v_uid
  for update;

  if not found then raise exception 'Profile not found'; end if;
  if v_profile.balance < p_amount then raise exception 'Insufficient balance'; end if;

  perform set_config('viax.progression', 'on', true);

  update public.profiles
  set balance = balance - p_amount
  where id = v_uid
  returning balance into v_balance_after;

  perform set_config('viax.progression', 'off', true);

  insert into public.transactions (
    user_id, type, amount, market_label,
    before_balance, after_balance
  )
  values (
    v_uid, 'withdraw', p_amount, 'Carteira',
    v_balance_after + p_amount,
    v_balance_after
  )
  returning id into v_tx_id;

  return jsonb_build_object('tx_id', v_tx_id, 'balance', v_balance_after);
exception
  when others then
    perform set_config('viax.progression', 'off', true);
    raise;
end;
$$;

create or replace function public.refund_market(
  p_market_id text,
  p_reason text default 'void'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market markets%rowtype;
  v_bet record;
  v_count int := 0;
  v_total numeric := 0;
begin
  select * into v_market from public.markets where id = p_market_id for update;
  if not found then raise exception 'Market not found'; end if;
  if v_market.status = 'void' then
    return jsonb_build_object('market_id', p_market_id, 'already_void', true);
  end if;
  if v_market.status = 'settled' then
    raise exception 'Cannot refund settled market';
  end if;

  for v_bet in
    select id, user_id, stake from public.bets
    where market_id = p_market_id and payout is null
  loop
    update public.bets set payout = 0 where id = v_bet.id;

    perform set_config('viax.progression', 'on', true);
    update public.profiles set balance = balance + v_bet.stake where id = v_bet.user_id;
    perform set_config('viax.progression', 'off', true);

    insert into public.transactions (user_id, type, market_id, market_label, amount)
    values (v_bet.user_id, 'refund', p_market_id, v_market.region, v_bet.stake);
    insert into public.notifications (user_id, kind, text, market_id)
    values (
      v_bet.user_id, 'refund',
      'Reembolso de ' || v_bet.stake::text || ' — ' || coalesce(p_reason, 'mercado cancelado'),
      p_market_id
    );
    v_count := v_count + 1;
    v_total := v_total + v_bet.stake;
  end loop;

  update public.markets
  set status = 'void', accept_bets = false,
      resolved_at = coalesce(resolved_at, now()),
      settled_at = now(), updated_at = now()
  where id = p_market_id;

  insert into public.market_resolutions (
    market_id, status, source, validation, payout_summary
  ) values (
    p_market_id, 'voided', coalesce(v_market.data_source, 'system'),
    jsonb_build_object('reason', p_reason),
    jsonb_build_object('refunds', v_count, 'total_refunded', v_total)
  );

  perform public.refresh_market_participant_stats(p_market_id);

  return jsonb_build_object(
    'market_id', p_market_id, 'status', 'void',
    'refunds', v_count, 'total_refunded', v_total
  );
exception
  when others then
    perform set_config('viax.progression', 'off', true);
    raise;
end;
$$;

create or replace function public.settle_market(
  p_market_id text,
  p_winning_side bet_side,
  p_resolution_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market markets%rowtype;
  v_action text;
  v_prize numeric;
  v_pool_win numeric;
  v_fee numeric;
  v_bet record;
  v_payout numeric;
  v_paid int := 0;
  v_paid_total numeric := 0;
  v_losing bet_side;
  v_balance_after numeric;
  v_result jsonb;
begin
  select * into v_market from public.markets where id = p_market_id for update;
  if not found then raise exception 'Market not found'; end if;
  if v_market.status in ('settled', 'void') then
    raise exception 'Market already terminal: %', v_market.status;
  end if;

  v_action := public.validate_market_pools(
    v_market.pool_yes, v_market.pool_no, p_winning_side
  );

  if v_action = 'void' then
    return public.refund_market(p_market_id, 'pool_validation_failed');
  end if;

  if p_winning_side = 'YES' then
    v_pool_win := v_market.pool_yes;
    v_losing := 'NO';
  else
    v_pool_win := v_market.pool_no;
    v_losing := 'YES';
  end if;

  v_prize := (v_market.pool_yes + v_market.pool_no) * (1 - v_market.house_fee_pct);
  v_fee := (v_market.pool_yes + v_market.pool_no) * v_market.house_fee_pct;

  update public.markets
  set status = 'settled',
      resolved = p_winning_side,
      accept_bets = false,
      resolved_at = now(),
      settled_at = now(),
      updated_at = now()
  where id = p_market_id;

  if v_fee > 0 then
    insert into public.platform_ledger (market_id, amount, kind, meta)
    values (
      p_market_id, v_fee, 'house_fee',
      jsonb_build_object(
        'pool_yes', v_market.pool_yes,
        'pool_no', v_market.pool_no,
        'house_fee_pct', v_market.house_fee_pct
      )
    );
    perform public.allocate_partner_commissions(p_market_id, v_fee);
  end if;

  update public.bets
  set payout = 0
  where market_id = p_market_id
    and side = v_losing
    and payout is null;

  insert into public.transactions (
    user_id, type, market_id, market_label, amount,
    before_balance, after_balance
  )
  select
    b.user_id,
    'loss'::tx_type,
    p_market_id,
    v_market.region,
    b.stake,
    p.balance,
    p.balance
  from public.bets b
  join public.profiles p on p.id = b.user_id
  where b.market_id = p_market_id
    and b.side = v_losing;

  for v_bet in
    select b.id, b.user_id, b.stake
    from public.bets b
    where b.market_id = p_market_id
      and b.side = p_winning_side
      and b.payout is null
  loop
    v_payout := round((v_bet.stake / v_pool_win) * v_prize, 2);

    update public.bets
    set payout = v_payout
    where id = v_bet.id;

    perform set_config('viax.progression', 'on', true);

    update public.profiles
    set balance = balance + v_payout,
        pnl = pnl + (v_payout - v_bet.stake)
    where id = v_bet.user_id
    returning balance into v_balance_after;

    perform set_config('viax.progression', 'off', true);

    insert into public.transactions (
      user_id, type, market_id, market_label, amount,
      before_balance, after_balance
    )
    values (
      v_bet.user_id, 'payout', p_market_id, v_market.region, v_payout,
      v_balance_after - v_payout,
      v_balance_after
    );

    insert into public.notifications (user_id, kind, text, market_id)
    values (
      v_bet.user_id, 'win',
      'Payout de ' || v_payout::text || ' BRL — ' || v_market.region,
      p_market_id
    );

    v_paid := v_paid + 1;
    v_paid_total := v_paid_total + v_payout;
  end loop;

  if p_resolution_id is not null then
    update public.market_resolutions
    set status = 'settled',
        payout_summary = jsonb_build_object(
          'winning_side', p_winning_side,
          'prize_pool', v_prize,
          'house_fee', v_fee,
          'payouts', v_paid,
          'total_paid', v_paid_total
        )
    where id = p_resolution_id;
  else
    insert into public.market_resolutions (
      market_id, status, derived_side, source, payout_summary
    ) values (
      p_market_id, 'settled', p_winning_side, 'manual',
      jsonb_build_object(
        'winning_side', p_winning_side,
        'prize_pool', v_prize,
        'house_fee', v_fee,
        'payouts', v_paid,
        'total_paid', v_paid_total
      )
    );
  end if;

  perform public.refresh_market_participant_stats(p_market_id);
  perform public.enqueue_event_impact_xp(p_market_id);

  v_result := jsonb_build_object(
    'market_id', p_market_id,
    'status', 'settled',
    'winning_side', p_winning_side,
    'prize_pool', v_prize,
    'house_fee', v_fee,
    'payouts', v_paid
  );

  return v_result;
exception
  when others then
    perform set_config('viax.progression', 'off', true);
    raise;
end;
$$;