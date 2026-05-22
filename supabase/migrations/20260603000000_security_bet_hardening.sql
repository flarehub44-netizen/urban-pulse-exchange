-- Security hardening for place_bet:
-- 1. Add server-side max stake (100,000) to prevent RPC bypass of TypeScript validation
-- 2. Add ends_at deadline check to prevent betting on expired markets when lifecycle cron is delayed
-- 3. Add SELECT policy for referral_clicks so partners can read their own click data directly

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

  -- Server-side stake bounds (mirrors TypeScript validation; prevents RPC bypass)
  if p_stake <= 0 then
    raise exception 'Stake must be positive';
  end if;

  if p_stake > 100000 then
    raise exception 'Stake cannot exceed R$ 100.000';
  end if;

  -- Lock profile to prevent concurrent balance race
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

  -- Deadline check: reject if the market's end time has already passed,
  -- even if the lifecycle cron hasn't updated the status yet.
  if v_market.ends_at is not null and v_market.ends_at < now() then
    raise exception 'Market % deadline has passed (ended %)', p_market_id, v_market.ends_at;
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

-- Allow partners to read their own click data directly
-- (reads are also available via RPC but this adds belt-and-suspenders)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'referral_clicks'
      and policyname = 'referral_clicks_own'
  ) then
    execute $policy$
      create policy "referral_clicks_own"
        on public.referral_clicks for select
        using (auth.uid() = partner_id)
    $policy$;
  end if;
end $$;
