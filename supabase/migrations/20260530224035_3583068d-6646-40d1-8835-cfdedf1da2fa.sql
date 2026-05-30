-- Allow place_bet and place_football_bet SECURITY DEFINER RPCs to update profiles.balance
-- by setting the viax.progression session flag the guard trigger looks for.

CREATE OR REPLACE FUNCTION public.place_bet(p_market_id text, p_side bet_side, p_stake numeric, p_idempotency_key text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_label        text;
  v_key          text := nullif(trim(coalesce(p_idempotency_key, '')), '');
  v_existing     public.bets%rowtype;
  v_balance      numeric;
begin
  perform set_config('viax.progression', 'on', true);

  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if v_key is null then
    raise exception 'idempotency_key_required';
  end if;

  perform public.assert_user_account_active(v_user_id);
  perform pg_advisory_xact_lock(hashtext(v_user_id::text || ':' || v_key));

  select * into v_existing
  from public.bets
  where user_id = v_user_id and idempotency_key = v_key;

  if found then
    if v_existing.market_id is distinct from p_market_id
      or v_existing.side is distinct from p_side
      or v_existing.stake is distinct from p_stake then
      raise exception 'idempotency_key_conflict';
    end if;

    select pool_yes, pool_no into v_new_pool_yes, v_new_pool_no
    from public.markets where id = v_existing.market_id;

    select balance into v_balance from public.profiles where id = v_user_id;

    select id into v_tx_id
    from public.transactions
    where user_id = v_user_id
      and market_id = v_existing.market_id
      and type = 'entry'
      and amount = v_existing.stake
    order by created_at desc
    limit 1;

    return jsonb_build_object(
      'bet_id',   v_existing.id,
      'tx_id',    v_tx_id,
      'pool_yes', v_new_pool_yes,
      'pool_no',  v_new_pool_no,
      'balance',  v_balance,
      'idempotent', true
    );
  end if;

  if p_stake <= 0 then raise exception 'Stake must be positive'; end if;
  if p_stake > 100000 then raise exception 'Stake cannot exceed 100.000 BRL'; end if;

  select count(*) into v_recent_bets
  from public.bets
  where user_id = v_user_id
    and created_at > now() - interval '60 seconds';

  if v_recent_bets >= 10 then
    raise exception 'rate_limit_exceeded: maximum 10 bets per minute';
  end if;

  select * into v_profile from public.profiles where id = v_user_id for update;
  if not found then raise exception 'Profile not found'; end if;
  if v_profile.balance < p_stake then raise exception 'Insufficient balance'; end if;

  select * into v_market from public.markets where id = p_market_id for update;
  if not found then raise exception 'Market not found'; end if;

  if coalesce(v_market.market_kind, 'platform') = 'community' then
    if not public.is_user_registered(v_user_id) then
      raise exception 'registration_required';
    end if;
    if v_market.visibility = 'unlisted' then
      if not exists (
        select 1 from public.market_access ma
        where ma.market_id = p_market_id and ma.user_id = v_user_id
      ) then
        raise exception 'market_access_denied';
      end if;
    end if;
  end if;

  if v_market.frozen then raise exception 'Market is frozen'; end if;
  if v_market.status not in ('live', 'closing') then
    raise exception 'Market % does not accept bets (status=%)', p_market_id, v_market.status;
  end if;
  if not v_market.accept_bets then raise exception 'Market closed for entries'; end if;
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

  v_label := case
    when v_market.market_kind = 'community' then left(v_market.question, 80)
    else v_market.region
  end;

  update public.profiles
  set balance    = balance - p_stake,
      volume_24h = volume_24h + p_stake
  where id = v_user_id;

  update public.markets
  set pool_yes = v_new_pool_yes,
      pool_no  = v_new_pool_no,
      participants = participants + 1
  where id = p_market_id;

  insert into public.bets (user_id, market_id, side, stake, share, idempotency_key)
  values (v_user_id, p_market_id, p_side, p_stake, v_share, v_key)
  returning id into v_bet_id;

  insert into public.transactions (
    user_id, type, market_id, market_label, amount, before_balance, after_balance
  )
  values (
    v_user_id, 'entry', p_market_id, v_label, p_stake,
    v_profile.balance, v_profile.balance - p_stake
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
$function$;

CREATE OR REPLACE FUNCTION public.place_football_bet(p_market_id text, p_outcome football_outcome, p_stake numeric, p_idempotency_key text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id     uuid := auth.uid();
  v_m           public.football_markets%rowtype;
  v_f           public.football_fixtures%rowtype;
  v_profile     public.profiles%rowtype;
  v_bet_id      uuid;
  v_tx_id       uuid;
  v_share       numeric;
  v_pool_win    numeric;
  v_new_home    numeric;
  v_new_draw    numeric;
  v_new_away    numeric;
  v_recent_bets int;
  v_key         text := nullif(trim(coalesce(p_idempotency_key, '')), '');
  v_existing    public.football_bets%rowtype;
  v_balance     numeric;
begin
  perform set_config('viax.progression', 'on', true);

  if v_user_id is null then raise exception 'Unauthorized'; end if;
  perform public.assert_user_account_active(v_user_id);
  if not public.is_football_enabled() then raise exception 'Football markets disabled'; end if;
  if p_stake <= 0 then raise exception 'Stake must be positive'; end if;
  if p_stake > 100000 then raise exception 'Stake cannot exceed 100.000 BRL'; end if;
  if v_key is null then raise exception 'idempotency_key_required'; end if;

  perform pg_advisory_xact_lock(hashtext(v_user_id::text || ':fb:' || v_key));

  select * into v_existing
  from public.football_bets
  where user_id = v_user_id and idempotency_key = v_key;

  if found then
    if v_existing.market_id is distinct from p_market_id
       or v_existing.outcome is distinct from p_outcome
       or v_existing.stake is distinct from p_stake then
      raise exception 'idempotency_key_conflict';
    end if;

    select pool_home, pool_draw, pool_away
      into v_new_home, v_new_draw, v_new_away
    from public.football_markets where id = v_existing.market_id;

    select balance into v_balance from public.profiles where id = v_user_id;

    select id into v_tx_id
    from public.transactions
    where user_id = v_user_id
      and market_id = v_existing.market_id
      and type = 'entry'
      and amount = v_existing.stake
    order by created_at desc
    limit 1;

    return jsonb_build_object(
      'bet_id', v_existing.id,
      'tx_id', v_tx_id,
      'pool_home', v_new_home,
      'pool_draw', v_new_draw,
      'pool_away', v_new_away,
      'balance', v_balance,
      'idempotent', true
    );
  end if;

  select count(*) into v_recent_bets
  from public.football_bets
  where user_id = v_user_id
    and created_at > now() - interval '60 seconds';
  if v_recent_bets >= 10 then
    raise exception 'rate_limit_exceeded: maximum 10 football bets per minute';
  end if;

  select * into v_profile from public.profiles where id = v_user_id for update;
  if not found then raise exception 'Profile not found'; end if;
  if v_profile.balance < p_stake then raise exception 'Insufficient balance'; end if;

  select * into v_m from public.football_markets where id = p_market_id for update;
  if not found then raise exception 'Market not found'; end if;

  select * into v_f from public.football_fixtures where api_fixture_id = v_m.fixture_id;
  if v_f.review_status <> 'approved' then raise exception 'Fixture not approved'; end if;

  if v_m.status not in ('live', 'closing') then
    raise exception 'Market does not accept bets (status=%)', v_m.status;
  end if;
  if not v_m.accept_bets then raise exception 'Market closed for entries'; end if;
  if now() >= v_m.betting_closes_at then raise exception 'Betting window closed'; end if;

  v_new_home := v_m.pool_home;
  v_new_draw := v_m.pool_draw;
  v_new_away := v_m.pool_away;

  case p_outcome
    when 'HOME' then v_new_home := v_m.pool_home + p_stake; v_pool_win := v_new_home;
    when 'DRAW' then v_new_draw := v_m.pool_draw + p_stake; v_pool_win := v_new_draw;
    when 'AWAY' then v_new_away := v_m.pool_away + p_stake; v_pool_win := v_new_away;
  end case;

  v_share := p_stake / v_pool_win;

  update public.profiles
  set balance = balance - p_stake, volume_24h = volume_24h + p_stake
  where id = v_user_id;

  update public.football_markets
  set pool_home = v_new_home,
      pool_draw = v_new_draw,
      pool_away = v_new_away,
      participants = participants + 1,
      updated_at = now()
  where id = p_market_id;

  insert into public.football_bets (user_id, market_id, outcome, stake, share, idempotency_key)
  values (v_user_id, p_market_id, p_outcome, p_stake, v_share, v_key)
  returning id into v_bet_id;

  insert into public.transactions (
    user_id, type, market_id, market_label, amount, before_balance, after_balance
  )
  values (
    v_user_id, 'entry', p_market_id, v_m.question, p_stake,
    v_profile.balance, v_profile.balance - p_stake
  )
  returning id into v_tx_id;

  return jsonb_build_object(
    'bet_id', v_bet_id,
    'tx_id', v_tx_id,
    'pool_home', v_new_home,
    'pool_draw', v_new_draw,
    'pool_away', v_new_away,
    'balance', v_profile.balance - p_stake
  );
end;
$function$;