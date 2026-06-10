-- Multi-outcome parimutuel markets (N-way pools)

create table if not exists public.prediction_markets (
  id              text primary key,
  question        text not null,
  vertical        public.market_vertical not null,
  collection_slug text references public.market_collections(slug) on delete set null,
  status          public.market_status not null default 'draft',
  image_url       text,
  accept_bets     boolean not null default true,
  frozen          boolean not null default false,
  participants    int not null default 0,
  ends_at         timestamptz not null,
  resolved_outcome_id uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists prediction_markets_vertical_status_idx
  on public.prediction_markets (vertical, status, ends_at);

create table if not exists public.market_outcomes (
  id          uuid primary key default gen_random_uuid(),
  market_id   text not null references public.prediction_markets(id) on delete cascade,
  slug        text not null,
  label       text not null,
  pool        numeric(14,2) not null default 0 check (pool >= 0),
  sort_order  int not null default 0,
  metadata    jsonb not null default '{}'::jsonb,
  unique (market_id, slug)
);

create index if not exists market_outcomes_market_idx
  on public.market_outcomes (market_id, sort_order);

create table if not exists public.outcome_bets (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  market_id        text not null references public.prediction_markets(id) on delete cascade,
  outcome_id       uuid not null references public.market_outcomes(id) on delete restrict,
  stake            numeric(12,2) not null check (stake > 0),
  share            numeric(10,8),
  payout           numeric(12,2),
  idempotency_key  text,
  created_at       timestamptz not null default now()
);

create unique index if not exists outcome_bets_user_idempotency_unique
  on public.outcome_bets (user_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists outcome_bets_user_created_idx
  on public.outcome_bets (user_id, created_at desc);

create index if not exists outcome_bets_market_idx
  on public.outcome_bets (market_id, outcome_id);

alter table public.prediction_markets enable row level security;
alter table public.market_outcomes enable row level security;
alter table public.outcome_bets enable row level security;

create policy prediction_markets_public_read on public.prediction_markets
  for select to anon, authenticated
  using (status in ('live', 'closing', 'settled', 'resolved', 'void', 'dispute'));

create policy market_outcomes_public_read on public.market_outcomes
  for select to anon, authenticated using (true);

create policy outcome_bets_own_read on public.outcome_bets
  for select to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- place_outcome_bet
-- ---------------------------------------------------------------------------
create or replace function public.place_outcome_bet(
  p_market_id text,
  p_outcome_id uuid,
  p_stake numeric,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_m public.prediction_markets%rowtype;
  v_o public.market_outcomes%rowtype;
  v_profile public.profiles%rowtype;
  v_bet_id uuid;
  v_tx_id uuid;
  v_share numeric;
  v_new_pool numeric;
  v_key text := nullif(trim(coalesce(p_idempotency_key, '')), '');
  v_existing public.outcome_bets%rowtype;
  v_recent int;
  v_balance numeric;
begin
  if v_user_id is null then raise exception 'Unauthorized'; end if;
  if p_stake <= 0 then raise exception 'Stake must be positive'; end if;
  if p_stake > 100000 then raise exception 'Stake cannot exceed 100.000 BRL'; end if;

  if v_key is not null then
    select * into v_existing from public.outcome_bets
    where user_id = v_user_id and idempotency_key = v_key;
    if found then
      if v_existing.market_id is distinct from p_market_id
        or v_existing.outcome_id is distinct from p_outcome_id
        or v_existing.stake is distinct from p_stake then
        raise exception 'idempotency_key_conflict';
      end if;
      select balance into v_balance from public.profiles where id = v_user_id;
      return jsonb_build_object(
        'bet_id', v_existing.id, 'balance', v_balance, 'idempotent', true
      );
    end if;
  end if;

  select count(*) into v_recent from public.outcome_bets
  where user_id = v_user_id and created_at > now() - interval '60 seconds';
  if v_recent >= 10 then raise exception 'rate_limit_exceeded'; end if;

  select * into v_profile from public.profiles where id = v_user_id for update;
  if not found then raise exception 'Profile not found'; end if;
  if v_profile.balance < p_stake then raise exception 'Insufficient balance'; end if;

  select * into v_m from public.prediction_markets where id = p_market_id for update;
  if not found then raise exception 'Market not found'; end if;
  if v_m.frozen then raise exception 'Market is frozen'; end if;
  if v_m.status not in ('live', 'closing') then
    raise exception 'Market does not accept bets (status=%)', v_m.status;
  end if;
  if not v_m.accept_bets then raise exception 'Market closed for entries'; end if;
  if v_m.ends_at < now() then raise exception 'Market deadline passed'; end if;

  select * into v_o from public.market_outcomes
  where id = p_outcome_id and market_id = p_market_id for update;
  if not found then raise exception 'Outcome not found'; end if;

  v_new_pool := v_o.pool + p_stake;
  v_share := p_stake / v_new_pool;

  update public.profiles
  set balance = balance - p_stake, volume_24h = volume_24h + p_stake
  where id = v_user_id;

  update public.market_outcomes set pool = v_new_pool where id = p_outcome_id;

  update public.prediction_markets
  set participants = participants + 1, updated_at = now()
  where id = p_market_id;

  insert into public.outcome_bets (user_id, market_id, outcome_id, stake, share, idempotency_key)
  values (v_user_id, p_market_id, p_outcome_id, p_stake, v_share, v_key)
  returning id into v_bet_id;

  insert into public.transactions (user_id, type, market_id, market_label, amount, before_balance, after_balance)
  values (v_user_id, 'entry', p_market_id, left(v_m.question, 80), p_stake,
    v_profile.balance, v_profile.balance - p_stake)
  returning id into v_tx_id;

  return jsonb_build_object(
    'bet_id', v_bet_id,
    'tx_id', v_tx_id,
    'outcome_id', p_outcome_id,
    'pool', v_new_pool,
    'balance', v_profile.balance - p_stake
  );
end;
$$;

revoke execute on function public.place_outcome_bet(text, uuid, numeric, text) from public, anon, authenticated;
grant execute on function public.place_outcome_bet(text, uuid, numeric, text) to authenticated;

-- ---------------------------------------------------------------------------
-- settle_outcome_market (admin / service)
-- ---------------------------------------------------------------------------
create or replace function public.settle_outcome_market(
  p_market_id text,
  p_winning_outcome_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_m public.prediction_markets%rowtype;
  v_bet record;
  v_total_pool numeric := 0;
  v_prize numeric;
  v_count int := 0;
  v_win_pool numeric;
begin
  perform public.assert_admin();

  select * into v_m from public.prediction_markets where id = p_market_id for update;
  if not found then raise exception 'Market not found'; end if;
  if v_m.status in ('settled', 'void', 'resolved') then
    raise exception 'Market already settled';
  end if;

  select coalesce(sum(pool), 0) into v_total_pool from public.market_outcomes where market_id = p_market_id;
  select pool into v_win_pool from public.market_outcomes where id = p_winning_outcome_id and market_id = p_market_id;
  if v_win_pool is null then raise exception 'Winning outcome not found'; end if;
  if v_win_pool <= 0 then
    update public.prediction_markets set status = 'void', resolved_outcome_id = null where id = p_market_id;
    return jsonb_build_object('action', 'void', 'reason', 'no_liquidity_on_winner');
  end if;

  v_prize := v_total_pool * 0.9;

  for v_bet in
    select * from public.outcome_bets
    where market_id = p_market_id and outcome_id = p_winning_outcome_id and payout is null
  loop
    declare v_payout numeric := (v_bet.share * v_prize);
    begin
      update public.profiles set balance = balance + v_payout where id = v_bet.user_id;
      update public.outcome_bets set payout = v_payout where id = v_bet.id;
      insert into public.transactions (user_id, type, market_id, market_label, amount)
      values (v_bet.user_id, 'payout', p_market_id, left(v_m.question, 80), v_payout);
      v_count := v_count + 1;
    end;
  end loop;

  update public.prediction_markets
  set status = 'settled', resolved_outcome_id = p_winning_outcome_id, updated_at = now()
  where id = p_market_id;

  return jsonb_build_object('action', 'settle', 'winners', v_count, 'prize_pool', v_prize);
end;
$$;

revoke execute on function public.settle_outcome_market(text, uuid) from public, anon, authenticated;
grant execute on function public.settle_outcome_market(text, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- admin_create_prediction_market
-- ---------------------------------------------------------------------------
create or replace function public.admin_create_prediction_market(
  p_id text,
  p_question text,
  p_vertical public.market_vertical,
  p_ends_at timestamptz,
  p_outcomes jsonb,
  p_collection_slug text default null,
  p_image_url text default null,
  p_publish boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_o jsonb;
  v_slug text;
  v_label text;
  v_sort int := 0;
  v_status public.market_status := 'draft';
begin
  perform public.assert_admin();

  if p_publish then v_status := 'live'; end if;

  insert into public.prediction_markets (
    id, question, vertical, collection_slug, status, image_url, ends_at, accept_bets
  ) values (
    p_id, p_question, p_vertical, p_collection_slug, v_status, p_image_url, p_ends_at, p_publish
  );

  for v_o in select * from jsonb_array_elements(p_outcomes)
  loop
    v_slug := v_o->>'slug';
    v_label := v_o->>'label';
    v_sort := v_sort + 1;
    insert into public.market_outcomes (market_id, slug, label, sort_order, metadata)
    values (
      p_id, v_slug, v_label, coalesce((v_o->>'sort_order')::int, v_sort),
      coalesce(v_o->'metadata', '{}'::jsonb)
    );
  end loop;

  return jsonb_build_object('id', p_id, 'status', v_status);
end;
$$;

revoke execute on function public.admin_create_prediction_market(text, text, public.market_vertical, timestamptz, jsonb, text, text, boolean) from public, anon, authenticated;
grant execute on function public.admin_create_prediction_market(text, text, public.market_vertical, timestamptz, jsonb, text, text, boolean) to service_role;
