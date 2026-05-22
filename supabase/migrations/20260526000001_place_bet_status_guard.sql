-- Tighten place_bet() to only accept bets on markets in 'live' or 'closing' status.
-- Previous version only rejected 'resolved'; this blocks 'draft', 'void', 'closed', 'resolving' too.
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
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  -- Lock profile to prevent concurrent balance race
  select * into v_profile
  from public.profiles
  where id = v_user_id
  for update;

  if not found then
    raise exception 'Profile not found';
  end if;

  if p_stake <= 0 then
    raise exception 'Stake must be positive';
  end if;

  if v_profile.balance < p_stake then
    raise exception 'Insufficient balance';
  end if;

  -- Lock market row
  select * into v_market
  from public.markets
  where id = p_market_id
  for update;

  if not found then
    raise exception 'Market not found';
  end if;

  if v_market.status not in ('live', 'closing') then
    raise exception 'Market % does not accept bets (status=%)', p_market_id, v_market.status;
  end if;

  -- Compute new pools and share
  if p_side = 'YES' then
    v_new_pool_yes := v_market.pool_yes + p_stake;
    v_new_pool_no  := v_market.pool_no;
    v_share        := p_stake / v_new_pool_yes;
  else
    v_new_pool_yes := v_market.pool_yes;
    v_new_pool_no  := v_market.pool_no + p_stake;
    v_share        := p_stake / v_new_pool_no;
  end if;

  -- Deduct balance
  update public.profiles
  set balance    = balance - p_stake,
      volume_24h = volume_24h + p_stake
  where id = v_user_id;

  -- Update market pools + participants
  update public.markets
  set pool_yes     = v_new_pool_yes,
      pool_no      = v_new_pool_no,
      participants = participants + 1
  where id = p_market_id;

  -- Write bet row
  insert into public.bets (user_id, market_id, side, stake, share)
  values (v_user_id, p_market_id, p_side, p_stake, v_share)
  returning id into v_bet_id;

  -- Write transaction row
  insert into public.transactions (user_id, type, market_id, market_label, amount)
  values (v_user_id, 'entry', p_market_id, v_market.region, p_stake)
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
