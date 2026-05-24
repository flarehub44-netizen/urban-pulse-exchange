-- Currency display: R$ symbol → BRL suffix in user-facing copy

-- Achievements (terminology + legacy seeds)
update public.achievements set
  name = 'Primeira previsão',
  description = 'Fez sua primeira previsão na cidade'
where id = 'first_bet';

update public.achievements set description = 'Movimentou 10.000 BRL em previsões' where id = 'volume_10k';
update public.achievements set description = '10 previsões realizadas' where id = 'bets_10';
update public.achievements set description = '50 previsões realizadas' where id = 'bets_50';
update public.achievements set description = '200 previsões realizadas' where id = 'bets_200';
update public.achievements set description = '500 previsões realizadas' where id = 'bets_500';
update public.achievements set description = '50.000 BRL movimentados em previsões' where id = 'volume_50k';
update public.achievements set description = '100.000 BRL movimentados em previsões' where id = 'volume_100k';
update public.achievements set description = '500.000 BRL movimentados em previsões' where id = 'volume_500k';
update public.achievements set description = 'Fez uma previsão com participação acima de 500 BRL' where id = 'big_stake';
update public.achievements set description = 'Retornou após 3+ dias ausente e fez uma previsão' where id = 'comeback_3';

update public.daily_missions set
  description = 'Faça uma previsão num mercado com pool acima de 5.000 BRL'
where id = 'big_pool';

update public.partner_missions set
  title = '50k BRL de volume'
where id = 'volume_50k_week';

-- Casino spin labels (RPC response)
create or replace function public._casino_execute_spin(p_source spin_source)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date := (timezone('America/Sao_Paulo', now()))::date;
  v_outcome jsonb;
  v_balance numeric := 0;
  v_xp int := 0;
  v_near_miss boolean;
  v_key text;
begin
  if v_user_id is null then raise exception 'Unauthorized'; end if;
  if not public.is_casino_enabled() then
    raise exception 'Casino mode disabled';
  end if;
  if exists (select 1 from public.profiles where id = v_user_id and casino_opt_out) then
    raise exception 'Casino opt-out active';
  end if;

  if exists (
    select 1 from public.user_spins
    where user_id = v_user_id and spin_date = v_today and source = p_source
  ) then
    return jsonb_build_object('already_spun', true, 'source', p_source);
  end if;

  v_outcome := public.pick_casino_spin_outcome();
  v_key := v_outcome->>'key';
  v_balance := coalesce((v_outcome->>'balance')::numeric, 0);
  v_xp := coalesce((v_outcome->>'xp')::int, 0);
  v_near_miss := coalesce((v_outcome->>'near_miss')::boolean, false);

  insert into public.user_spins (user_id, spin_date, source, outcome_key, reward_amount, reward_xp, is_near_miss)
  values (v_user_id, v_today, p_source, v_key, v_balance, v_xp, v_near_miss);

  if v_balance > 0 then
    perform public.wallet_deposit(v_balance);
  end if;
  if v_xp > 0 then
    perform public.apply_user_progress(v_user_id, 'casino_spin', v_xp);
  end if;

  return jsonb_build_object(
    'outcome_key', v_key,
    'balance', v_balance,
    'xp', v_xp,
    'is_near_miss', v_near_miss,
    'label', case v_key
      when 'balance_25' then '+25 BRL de saldo'
      when 'balance_75' then '+75 BRL de saldo'
      when 'balance_200' then '+200 BRL de saldo'
      when 'xp_50' then '+50 XP'
      when 'near_miss_jackpot' then 'Quase no jackpot!'
      else v_key
    end
  );
end;
$$;

-- place_bet: max stake error message
create or replace function public.place_bet(
  p_market_id text,
  p_side      bet_side,
  p_stake     numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id      uuid := auth.uid();
  v_market       markets%rowtype;
  v_profile      profiles%rowtype;
  v_new_pool_yes numeric;
  v_new_pool_no  numeric;
  v_share        numeric;
  v_bet_id       uuid;
  v_tx_id        uuid;
  v_recent_bets  int;
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_stake <= 0 then
    raise exception 'Stake must be positive';
  end if;
  if p_stake > 100000 then
    raise exception 'Stake cannot exceed 100.000 BRL';
  end if;

  select count(*) into v_recent_bets
  from public.bets
  where user_id = v_user_id
    and created_at > now() - interval '60 seconds';

  if v_recent_bets >= 10 then
    raise exception 'rate_limit_exceeded: maximum 10 bets per minute';
  end if;

  select * into v_profile
  from public.profiles
  where id = v_user_id
  for update;

  if not found then
    raise exception 'Profile not found';
  end if;

  if v_profile.balance < p_stake then
    raise exception 'Insufficient balance';
  end if;

  select * into v_market
  from public.markets
  where id = p_market_id
  for update;

  if not found then
    raise exception 'Market not found';
  end if;

  if v_market.frozen then
    raise exception 'Market is frozen';
  end if;

  if v_market.status not in ('live', 'closing') then
    raise exception 'Market % does not accept bets (status=%)', p_market_id, v_market.status;
  end if;

  if not v_market.accept_bets then
    raise exception 'Market closed for entries';
  end if;

  if v_market.ends_at is not null and v_market.ends_at < now() then
    raise exception 'Market % deadline has passed (ended %)', p_market_id, v_market.ends_at;
  end if;

  if p_side = 'YES' then
    v_new_pool_yes := v_market.pool_yes + p_stake;
    v_new_pool_no  := v_market.pool_no;
    v_share        := p_stake / v_new_pool_yes;
  else
    v_new_pool_yes := v_market.pool_yes;
    v_new_pool_no  := v_market.pool_no + p_stake;
    v_share        := p_stake / v_new_pool_no;
  end if;

  update public.profiles
  set balance    = balance - p_stake,
      volume_24h = volume_24h + p_stake
  where id = v_user_id;

  update public.markets
  set pool_yes     = v_new_pool_yes,
      pool_no      = v_new_pool_no,
      participants = participants + 1
  where id = p_market_id;

  insert into public.bets (user_id, market_id, side, stake, share)
  values (v_user_id, p_market_id, p_side, p_stake, v_share)
  returning id into v_bet_id;

  insert into public.transactions (
    user_id, type, market_id, market_label, amount,
    before_balance, after_balance
  )
  values (
    v_user_id, 'entry', p_market_id, v_market.region, p_stake,
    v_profile.balance,
    v_profile.balance - p_stake
  )
  returning id into v_tx_id;

  return jsonb_build_object(
    'bet_id',   v_bet_id,
    'tx_id',    v_tx_id,
    'pool_yes', v_new_pool_yes,
    'pool_no',  v_new_pool_no,
    'balance',  v_profile.balance - p_stake
  );
end;
$$;

-- Withdrawal KYC threshold message
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

-- Payment webhooks: notification copy
create or replace function public.service_credit_balance(
  p_user_id  uuid,
  p_amount   numeric,
  p_intent_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance_after numeric;
begin
  update public.profiles
  set balance = balance + p_amount
  where id = p_user_id
  returning balance into v_balance_after;

  if not found then
    raise exception 'Profile not found: %', p_user_id;
  end if;

  insert into public.transactions (
    user_id, type, amount, market_label,
    before_balance, after_balance
  )
  values (
    p_user_id, 'deposit', p_amount, 'Depósito Pix',
    v_balance_after - p_amount,
    v_balance_after
  );

  insert into public.notifications (user_id, kind, text)
  values (
    p_user_id, 'alert',
    'Depósito de ' || p_amount::text || ' BRL confirmado!'
  );
end;
$$;

create or replace function public.service_refund_withdrawal(
  p_user_id   uuid,
  p_amount    numeric,
  p_intent_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance_after numeric;
begin
  update public.profiles
  set balance = balance + p_amount
  where id = p_user_id
  returning balance into v_balance_after;

  if not found then
    raise exception 'Profile not found: %', p_user_id;
  end if;

  insert into public.transactions (
    user_id, type, amount, market_label,
    before_balance, after_balance
  )
  values (
    p_user_id, 'refund', p_amount, 'Estorno de Saque',
    v_balance_after - p_amount,
    v_balance_after
  );

  insert into public.notifications (user_id, kind, text)
  values (
    p_user_id, 'refund',
    'Saque de ' || p_amount::text || ' BRL não pôde ser processado. Saldo estornado.'
  );
end;
$$;

-- settle_market: win notification copy (BRL suffix)
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
  v_market       markets%rowtype;
  v_action       text;
  v_prize        numeric;
  v_pool_win     numeric;
  v_fee          numeric;
  v_bet          record;
  v_payout       numeric;
  v_paid         int := 0;
  v_paid_total   numeric := 0;
  v_losing       bet_side;
  v_balance_after numeric;
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
    v_losing   := 'NO';
  else
    v_pool_win := v_market.pool_no;
    v_losing   := 'YES';
  end if;

  v_prize := (v_market.pool_yes + v_market.pool_no) * (1 - v_market.house_fee_pct);
  v_fee   := (v_market.pool_yes + v_market.pool_no) * v_market.house_fee_pct;

  update public.markets
  set status      = 'settled',
      resolved    = p_winning_side,
      accept_bets = false,
      resolved_at = now(),
      settled_at  = now(),
      updated_at  = now()
  where id = p_market_id;

  if v_fee > 0 then
    insert into public.platform_ledger (market_id, amount, kind, meta)
    values (
      p_market_id, v_fee, 'house_fee',
      jsonb_build_object(
        'pool_yes',       v_market.pool_yes,
        'pool_no',        v_market.pool_no,
        'house_fee_pct',  v_market.house_fee_pct
      )
    );
  end if;

  update public.bets
  set payout = 0
  where market_id = p_market_id
    and side      = v_losing
    and payout    is null;

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
    and b.side      = v_losing;

  for v_bet in
    select b.id, b.user_id, b.stake
    from public.bets b
    where b.market_id = p_market_id
      and b.side      = p_winning_side
      and b.payout    is null
  loop
    v_payout := round((v_bet.stake / v_pool_win) * v_prize, 2);

    update public.bets
    set payout = v_payout
    where id = v_bet.id;

    update public.profiles
    set balance = balance + v_payout,
        pnl     = pnl + (v_payout - v_bet.stake)
    where id = v_bet.user_id
    returning balance into v_balance_after;

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

    v_paid       := v_paid + 1;
    v_paid_total := v_paid_total + v_payout;
  end loop;

  if p_resolution_id is not null then
    update public.market_resolutions
    set status        = 'settled',
        payout_summary = jsonb_build_object(
          'winning_side', p_winning_side,
          'prize_pool',   v_prize,
          'house_fee',    v_fee,
          'payouts',      v_paid,
          'total_paid',   v_paid_total
        )
    where id = p_resolution_id;
  else
    insert into public.market_resolutions (
      market_id, status, derived_side, source, payout_summary
    ) values (
      p_market_id, 'settled', p_winning_side, 'manual',
      jsonb_build_object(
        'winning_side', p_winning_side,
        'prize_pool',   v_prize,
        'house_fee',    v_fee,
        'payouts',      v_paid,
        'total_paid',   v_paid_total
      )
    );
  end if;

  perform public.refresh_market_participant_stats(p_market_id);

  return jsonb_build_object(
    'market_id',    p_market_id,
    'status',       'settled',
    'winning_side', p_winning_side,
    'prize_pool',   v_prize,
    'house_fee',    v_fee,
    'payouts',      v_paid
  );
end;
$$;
