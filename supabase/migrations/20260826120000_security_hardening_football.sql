-- Security hardening: place_football_bet idempotency + account-active guard
-- Fixes:
--   V03 — no idempotency → double-spend on network retry / double-click
--   V04 — banned users could still place football bets

-- 1. Add idempotency_key column to football_bets
alter table public.football_bets
  add column if not exists idempotency_key text;

create unique index if not exists football_bets_user_idempotency_key_idx
  on public.football_bets (user_id, idempotency_key)
  where idempotency_key is not null;

-- 2. Harden place_football_bet
create or replace function public.place_football_bet(
  p_market_id       text,
  p_outcome         public.football_outcome,
  p_stake           numeric,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
  if v_user_id is null then raise exception 'Unauthorized'; end if;

  -- V04: reject banned / suspended accounts before any work
  perform public.assert_user_account_active(v_user_id);

  if not public.is_football_enabled() then raise exception 'Football markets disabled'; end if;

  if p_stake <= 0 then raise exception 'Stake must be positive'; end if;
  if p_stake > 100000 then raise exception 'Stake cannot exceed 100.000 BRL'; end if;

  -- V03: idempotency key required
  if v_key is null then
    raise exception 'idempotency_key_required';
  end if;

  -- V03: advisory lock — prevents concurrent requests with same key racing
  perform pg_advisory_xact_lock(hashtext(v_user_id::text || ':fb:' || v_key));

  -- V03: deduplication — return cached result if key already processed
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
      'bet_id',     v_existing.id,
      'tx_id',      v_tx_id,
      'pool_home',  v_new_home,
      'pool_draw',  v_new_draw,
      'pool_away',  v_new_away,
      'balance',    v_balance,
      'idempotent', true
    );
  end if;

  -- Rate limit: max 10 football bets per minute (preserves behaviour from 20260702)
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
    when 'HOME' then
      v_new_home := v_m.pool_home + p_stake;
      v_pool_win := v_new_home;
    when 'DRAW' then
      v_new_draw := v_m.pool_draw + p_stake;
      v_pool_win := v_new_draw;
    when 'AWAY' then
      v_new_away := v_m.pool_away + p_stake;
      v_pool_win := v_new_away;
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
    'bet_id',    v_bet_id,
    'tx_id',     v_tx_id,
    'pool_home', v_new_home,
    'pool_draw', v_new_draw,
    'pool_away', v_new_away,
    'balance',   v_profile.balance - p_stake
  );
end;
$$;

grant execute on function public.place_football_bet(text, public.football_outcome, numeric, text)
  to authenticated;
