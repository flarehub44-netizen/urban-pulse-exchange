-- Football 1X2 markets (API-Sports) — separate from urban binary markets

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.football_review_status as enum ('pending_review', 'approved', 'rejected');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.football_outcome as enum ('HOME', 'DRAW', 'AWAY');
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.football_leagues (
  api_league_id int primary key,
  name          text not null,
  country       text not null default '',
  season        int,
  enabled       boolean not null default true,
  updated_at    timestamptz not null default now()
);

create table if not exists public.football_fixtures (
  api_fixture_id   bigint primary key,
  api_league_id    int not null references public.football_leagues(api_league_id) on delete cascade,
  season           int not null default 0,
  kickoff_at       timestamptz not null,
  status_short     text not null default 'NS',
  home_team_id     int not null,
  home_team_name   text not null,
  away_team_id     int not null,
  away_team_name   text not null,
  goals_home       int,
  goals_away       int,
  venue            text,
  review_status    public.football_review_status not null default 'pending_review',
  reviewed_by      uuid references public.profiles(id) on delete set null,
  reviewed_at      timestamptz,
  reject_reason    text,
  raw_payload      jsonb not null default '{}',
  synced_at        timestamptz not null default now(),
  created_at       timestamptz not null default now()
);

create index if not exists football_fixtures_review_kickoff_idx
  on public.football_fixtures(review_status, kickoff_at);

create table if not exists public.football_markets (
  id                 text primary key,
  fixture_id         bigint not null references public.football_fixtures(api_fixture_id) on delete cascade,
  question           text not null,
  status             public.market_status not null default 'draft',
  pool_home          numeric(14,2) not null default 0 check (pool_home >= 0),
  pool_draw          numeric(14,2) not null default 0 check (pool_draw >= 0),
  pool_away          numeric(14,2) not null default 0 check (pool_away >= 0),
  participants       int not null default 0,
  winning_outcome    public.football_outcome,
  accept_bets        boolean not null default false,
  betting_closes_at  timestamptz not null,
  house_fee_pct      numeric(5,4) not null default 0.10
    check (house_fee_pct >= 0 and house_fee_pct < 1),
  resolved_at        timestamptz,
  settled_at         timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (fixture_id)
);

create index if not exists football_markets_status_idx on public.football_markets(status);

create table if not exists public.football_bets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  market_id  text not null references public.football_markets(id) on delete cascade,
  outcome    public.football_outcome not null,
  stake      numeric(12,2) not null check (stake > 0),
  share      numeric(10,8),
  payout     numeric(12,2),
  created_at timestamptz not null default now()
);

create index if not exists football_bets_user_idx on public.football_bets(user_id, created_at desc);
create index if not exists football_bets_market_idx on public.football_bets(market_id, outcome);

create table if not exists public.football_market_resolutions (
  id              uuid primary key default gen_random_uuid(),
  market_id       text not null references public.football_markets(id) on delete cascade,
  status          text not null check (status in ('submitted', 'settled', 'voided')),
  winning_outcome public.football_outcome,
  goals_home      int,
  goals_away      int,
  source          text not null default 'api_football',
  inputs          jsonb not null default '{}',
  payout_summary  jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists football_market_resolutions_market_idx
  on public.football_market_resolutions(market_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Platform settings
-- ---------------------------------------------------------------------------
insert into public.platform_settings (key, value) values
  ('football_enabled', 'true'::jsonb),
  ('football_league_ids', '[71]'::jsonb),
  ('football_sync_days_ahead', '7'::jsonb),
  ('football_betting_close_minutes', '5'::jsonb),
  ('football_regulation', '"90min"'::jsonb),
  ('football_auto_resolve', 'true'::jsonb)
on conflict (key) do nothing;

insert into public.football_leagues (api_league_id, name, country, enabled) values
  (71, 'Brasileirão Série A', 'Brazil', true)
on conflict (api_league_id) do nothing;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.football_setting_json(p_key text, p_default jsonb default 'null'::jsonb)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select value from public.platform_settings where key = p_key),
    p_default
  );
$$;

create or replace function public.football_setting_num(p_key text, p_default numeric)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select (value #>> '{}')::numeric from public.platform_settings where key = p_key),
    p_default
  );
$$;

create or replace function public.is_football_enabled()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select (value #>> '{}')::boolean from public.platform_settings where key = 'football_enabled'),
    false
  );
$$;

create or replace function public.football_assert_admin()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin boolean;
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  select is_admin into v_admin from public.profiles where id = auth.uid();
  if not coalesce(v_admin, false) then raise exception 'Admin only'; end if;
end;
$$;

create or replace function public.football_min_minority_ratio()
returns numeric language sql immutable as $$ select 0.05::numeric $$;

-- ---------------------------------------------------------------------------
-- Pool validation (3-way parimutuel)
-- ---------------------------------------------------------------------------
create or replace function public.validate_football_pools(
  p_pool_home numeric,
  p_pool_draw numeric,
  p_pool_away numeric,
  p_winning public.football_outcome
)
returns text
language plpgsql
stable
as $$
declare
  v_total numeric;
  v_win   numeric;
  v_min   numeric;
begin
  v_total := p_pool_home + p_pool_draw + p_pool_away;
  if v_total <= 0 then return 'void'; end if;

  v_win := case p_winning
    when 'HOME' then p_pool_home
    when 'DRAW' then p_pool_draw
    when 'AWAY' then p_pool_away
  end;

  if v_win <= 0 then return 'void'; end if;

  v_min := least(p_pool_home, p_pool_draw, p_pool_away);
  if v_min = 0 then
    if v_win > 0 then return 'settle'; end if;
    return 'void';
  end if;

  if v_min / v_total < public.football_min_minority_ratio() then
    return 'void';
  end if;

  return 'settle';
end;
$$;

create or replace function public.football_derive_outcome(p_goals_home int, p_goals_away int)
returns public.football_outcome
language plpgsql
immutable
as $$
begin
  if p_goals_home is null or p_goals_away is null then
    raise exception 'Goals required for outcome derivation';
  end if;
  if p_goals_home > p_goals_away then return 'HOME'; end if;
  if p_goals_home < p_goals_away then return 'AWAY'; end if;
  return 'DRAW';
end;
$$;

-- ---------------------------------------------------------------------------
-- Sync (service role / cron)
-- ---------------------------------------------------------------------------
create or replace function public.upsert_football_fixture(
  p_api_fixture_id bigint,
  p_api_league_id int,
  p_season int,
  p_kickoff_at timestamptz,
  p_status_short text,
  p_home_team_id int,
  p_home_team_name text,
  p_away_team_id int,
  p_away_team_name text,
  p_goals_home int,
  p_goals_away int,
  p_venue text default null,
  p_league_name text default null,
  p_league_country text default null,
  p_raw jsonb default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.football_fixtures%rowtype;
  v_close_min int;
begin
  insert into public.football_leagues (api_league_id, name, country, enabled)
  values (
    p_api_league_id,
    coalesce(p_league_name, 'League ' || p_api_league_id::text),
    coalesce(p_league_country, ''),
    true
  )
  on conflict (api_league_id) do update set
    name = coalesce(excluded.name, football_leagues.name),
    updated_at = now();

  select * into v_existing from public.football_fixtures where api_fixture_id = p_api_fixture_id;

  if found and v_existing.review_status = 'rejected' then
    return jsonb_build_object('fixture_id', p_api_fixture_id, 'skipped', 'rejected');
  end if;

  insert into public.football_fixtures (
    api_fixture_id, api_league_id, season, kickoff_at, status_short,
    home_team_id, home_team_name, away_team_id, away_team_name,
    goals_home, goals_away, venue, raw_payload, synced_at,
    review_status
  ) values (
    p_api_fixture_id, p_api_league_id, p_season, p_kickoff_at, p_status_short,
    p_home_team_id, p_home_team_name, p_away_team_id, p_away_team_name,
    p_goals_home, p_goals_away, p_venue, coalesce(p_raw, '{}'), now(),
    case when found then v_existing.review_status else 'pending_review'::public.football_review_status end
  )
  on conflict (api_fixture_id) do update set
    kickoff_at = excluded.kickoff_at,
    status_short = excluded.status_short,
    goals_home = coalesce(excluded.goals_home, football_fixtures.goals_home),
    goals_away = coalesce(excluded.goals_away, football_fixtures.goals_away),
    venue = coalesce(excluded.venue, football_fixtures.venue),
    raw_payload = excluded.raw_payload,
    synced_at = now();

  -- Update live markets betting state
  v_close_min := public.football_setting_num('football_betting_close_minutes', 5)::int;

  update public.football_markets fm
  set
    betting_closes_at = f.kickoff_at - (v_close_min || ' minutes')::interval,
    accept_bets = case
      when fm.status = 'live' and f.status_short in ('NS', 'TBD', 'PST') and now() < f.kickoff_at - (v_close_min || ' minutes')::interval
        then true
      else false
    end,
    status = case
      when fm.status = 'live' and f.status_short not in ('NS', 'TBD', 'PST') then 'closed'
      else fm.status
    end,
    updated_at = now()
  from public.football_fixtures f
  where fm.fixture_id = f.api_fixture_id
    and f.api_fixture_id = p_api_fixture_id
    and fm.status in ('live', 'closing');

  return jsonb_build_object('fixture_id', p_api_fixture_id, 'ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin: list / approve / reject / publish
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_football_pending(p_limit int default 50)
returns setof jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.football_assert_admin();

  return query
  select jsonb_build_object(
    'api_fixture_id', f.api_fixture_id,
    'kickoff_at', f.kickoff_at,
    'status_short', f.status_short,
    'home_team_name', f.home_team_name,
    'away_team_name', f.away_team_name,
    'league_id', f.api_league_id,
    'league_name', l.name,
    'review_status', f.review_status,
    'goals_home', f.goals_home,
    'goals_away', f.goals_away,
    'market_id', fm.id,
    'market_status', fm.status
  )
  from public.football_fixtures f
  join public.football_leagues l on l.api_league_id = f.api_league_id
  left join public.football_markets fm on fm.fixture_id = f.api_fixture_id
  where f.review_status = 'pending_review'
  order by f.kickoff_at asc
  limit greatest(1, least(p_limit, 200));
end;
$$;

create or replace function public.admin_list_football_drafts(p_limit int default 50)
returns setof jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.football_assert_admin();

  return query
  select jsonb_build_object(
    'market_id', fm.id,
    'question', fm.question,
    'status', fm.status,
    'kickoff_at', f.kickoff_at,
    'home_team_name', f.home_team_name,
    'away_team_name', f.away_team_name,
    'pool_home', fm.pool_home,
    'pool_draw', fm.pool_draw,
    'pool_away', fm.pool_away
  )
  from public.football_markets fm
  join public.football_fixtures f on f.api_fixture_id = fm.fixture_id
  where fm.status = 'draft'
  order by f.kickoff_at asc
  limit greatest(1, least(p_limit, 200));
end;
$$;

create or replace function public.admin_approve_football_fixture(p_fixture_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_f public.football_fixtures%rowtype;
  v_market_id text;
  v_close_min int;
  v_question text;
begin
  perform public.football_assert_admin();

  select * into v_f from public.football_fixtures where api_fixture_id = p_fixture_id for update;
  if not found then raise exception 'Fixture not found'; end if;
  if v_f.review_status = 'rejected' then raise exception 'Fixture was rejected'; end if;
  if v_f.review_status = 'approved' then
    select id into v_market_id from public.football_markets where fixture_id = p_fixture_id;
    return jsonb_build_object('market_id', v_market_id, 'already_approved', true);
  end if;

  update public.football_fixtures
  set review_status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      reject_reason = null
  where api_fixture_id = p_fixture_id;

  v_close_min := public.football_setting_num('football_betting_close_minutes', 5)::int;
  v_question := v_f.home_team_name || ' x ' || v_f.away_team_name || ' — resultado';
  v_market_id := 'fb-' || p_fixture_id::text;

  insert into public.football_markets (
    id, fixture_id, question, status, accept_bets,
    betting_closes_at
  ) values (
    v_market_id, p_fixture_id, v_question, 'draft', false,
    v_f.kickoff_at - (v_close_min || ' minutes')::interval
  )
  on conflict (fixture_id) do nothing;

  select id into v_market_id from public.football_markets where fixture_id = p_fixture_id;

  return jsonb_build_object('market_id', v_market_id, 'status', 'draft');
end;
$$;

create or replace function public.admin_reject_football_fixture(
  p_fixture_id bigint,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.football_assert_admin();

  update public.football_fixtures
  set review_status = 'rejected',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      reject_reason = nullif(trim(p_reason), '')
  where api_fixture_id = p_fixture_id;

  if not found then raise exception 'Fixture not found'; end if;

  return jsonb_build_object('fixture_id', p_fixture_id, 'status', 'rejected');
end;
$$;

create or replace function public.admin_publish_football_market(p_market_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_m public.football_markets%rowtype;
  v_f public.football_fixtures%rowtype;
begin
  perform public.football_assert_admin();

  select * into v_m from public.football_markets where id = p_market_id for update;
  if not found then raise exception 'Market not found'; end if;
  if v_m.status <> 'draft' then
    raise exception 'Market must be draft to publish (status=%)', v_m.status;
  end if;

  select * into v_f from public.football_fixtures where api_fixture_id = v_m.fixture_id;
  if v_f.review_status <> 'approved' then
    raise exception 'Fixture not approved';
  end if;

  if v_f.kickoff_at <= now() then
    raise exception 'Kickoff already passed';
  end if;

  update public.football_markets
  set status = 'live', accept_bets = true, updated_at = now()
  where id = p_market_id;

  return jsonb_build_object('market_id', p_market_id, 'status', 'live');
end;
$$;

create or replace function public.admin_void_football_market(
  p_market_id text,
  p_reason text default 'void'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.football_assert_admin();
  return public.refund_football_market(p_market_id, p_reason);
end;
$$;

-- ---------------------------------------------------------------------------
-- place_football_bet
-- ---------------------------------------------------------------------------
create or replace function public.place_football_bet(
  p_market_id text,
  p_outcome public.football_outcome,
  p_stake numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_m public.football_markets%rowtype;
  v_f public.football_fixtures%rowtype;
  v_profile public.profiles%rowtype;
  v_bet_id uuid;
  v_tx_id uuid;
  v_share numeric;
  v_pool_win numeric;
  v_new_home numeric;
  v_new_draw numeric;
  v_new_away numeric;
begin
  if v_user_id is null then raise exception 'Unauthorized'; end if;
  if not public.is_football_enabled() then raise exception 'Football markets disabled'; end if;
  if p_stake <= 0 then raise exception 'Stake must be positive'; end if;
  if p_stake > 100000 then raise exception 'Stake cannot exceed 100.000 BRL'; end if;

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

  insert into public.football_bets (user_id, market_id, outcome, stake, share)
  values (v_user_id, p_market_id, p_outcome, p_stake, v_share)
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
$$;

-- ---------------------------------------------------------------------------
-- refund / settle
-- ---------------------------------------------------------------------------
create or replace function public.refund_football_market(
  p_market_id text,
  p_reason text default 'void'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_m public.football_markets%rowtype;
  v_f public.football_fixtures%rowtype;
  v_bet record;
  v_count int := 0;
  v_total numeric := 0;
begin
  select * into v_m from public.football_markets where id = p_market_id for update;
  if not found then raise exception 'Market not found'; end if;
  if v_m.status = 'void' then
    return jsonb_build_object('market_id', p_market_id, 'already_void', true);
  end if;
  if v_m.status = 'settled' then raise exception 'Cannot refund settled market'; end if;

  select * into v_f from public.football_fixtures where api_fixture_id = v_m.fixture_id;

  for v_bet in
    select id, user_id, stake from public.football_bets
    where market_id = p_market_id and payout is null
  loop
    update public.football_bets set payout = 0 where id = v_bet.id;
    update public.profiles set balance = balance + v_bet.stake where id = v_bet.user_id;
    insert into public.transactions (user_id, type, market_id, market_label, amount)
    values (v_bet.user_id, 'refund', p_market_id, v_m.question, v_bet.stake);
    insert into public.notifications (user_id, kind, text, market_id)
    values (
      v_bet.user_id, 'refund',
      'Reembolso de ' || v_bet.stake::text || ' BRL — ' || coalesce(p_reason, 'mercado cancelado'),
      p_market_id
    );
    v_count := v_count + 1;
    v_total := v_total + v_bet.stake;
  end loop;

  update public.football_markets
  set status = 'void', accept_bets = false,
      resolved_at = coalesce(resolved_at, now()),
      settled_at = now(), updated_at = now()
  where id = p_market_id;

  insert into public.football_market_resolutions (
    market_id, status, source, inputs, payout_summary
  ) values (
    p_market_id, 'voided', 'api_football',
    jsonb_build_object('reason', p_reason, 'fixture_status', v_f.status_short),
    jsonb_build_object('refunds', v_count, 'total_refunded', v_total)
  );

  return jsonb_build_object(
    'market_id', p_market_id, 'status', 'void',
    'refunds', v_count, 'total_refunded', v_total
  );
end;
$$;

create or replace function public.settle_football_market(
  p_market_id text,
  p_winning public.football_outcome,
  p_goals_home int default null,
  p_goals_away int default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_m public.football_markets%rowtype;
  v_action text;
  v_total numeric;
  v_pool_win numeric;
  v_prize numeric;
  v_fee numeric;
  v_bet record;
  v_payout numeric;
  v_paid int := 0;
  v_paid_total numeric := 0;
  v_label text;
begin
  select * into v_m from public.football_markets where id = p_market_id for update;
  if not found then raise exception 'Market not found'; end if;
  if v_m.status in ('settled', 'void') then
    return jsonb_build_object('market_id', p_market_id, 'already_terminal', true, 'status', v_m.status);
  end if;

  v_action := public.validate_football_pools(v_m.pool_home, v_m.pool_draw, v_m.pool_away, p_winning);
  if v_action = 'void' then
    return public.refund_football_market(p_market_id, 'pool_validation_failed');
  end if;

  v_pool_win := case p_winning
    when 'HOME' then v_m.pool_home
    when 'DRAW' then v_m.pool_draw
    when 'AWAY' then v_m.pool_away
  end;

  v_total := v_m.pool_home + v_m.pool_draw + v_m.pool_away;
  v_prize := v_total * (1 - v_m.house_fee_pct);
  v_fee := v_total * v_m.house_fee_pct;
  v_label := v_m.question;

  update public.football_markets
  set status = 'settled',
      winning_outcome = p_winning,
      accept_bets = false,
      resolved_at = now(),
      settled_at = now(),
      updated_at = now()
  where id = p_market_id;

  update public.football_bets
  set payout = 0
  where market_id = p_market_id
    and outcome is distinct from p_winning
    and payout is null;

  for v_bet in
    select b.id, b.user_id, b.stake, b.share
    from public.football_bets b
    where b.market_id = p_market_id
      and b.outcome = p_winning
      and b.payout is null
  loop
    v_payout := round((v_bet.stake / v_pool_win) * v_prize, 2);
    update public.football_bets set payout = v_payout where id = v_bet.id;
    update public.profiles set balance = balance + v_payout where id = v_bet.user_id;

    insert into public.transactions (user_id, type, market_id, market_label, amount)
    values (v_bet.user_id, 'payout', p_market_id, v_label, v_payout);

    insert into public.notifications (user_id, kind, text, market_id)
    values (
      v_bet.user_id, 'win',
      'Você ganhou ' || v_payout::text || ' BRL em ' || v_label,
      p_market_id
    );

    v_paid := v_paid + 1;
    v_paid_total := v_paid_total + v_payout;
  end loop;

  insert into public.football_market_resolutions (
    market_id, status, winning_outcome, goals_home, goals_away, payout_summary
  ) values (
    p_market_id, 'settled', p_winning, p_goals_home, p_goals_away,
    jsonb_build_object(
      'winners', v_paid,
      'total_paid', v_paid_total,
      'house_fee', v_fee,
      'prize_pool', v_prize
    )
  );

  return jsonb_build_object(
    'market_id', p_market_id,
    'status', 'settled',
    'winning_outcome', p_winning,
    'winners', v_paid,
    'total_paid', v_paid_total
  );
end;
$$;

create or replace function public.resolve_football_fixture(p_fixture_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_f public.football_fixtures%rowtype;
  v_m public.football_markets%rowtype;
  v_outcome public.football_outcome;
  v_void_statuses text[] := array['CANC', 'ABD', 'AWD', 'WO'];
  v_terminal_statuses text[] := array['FT', 'AET', 'PEN'];
begin
  select * into v_f from public.football_fixtures where api_fixture_id = p_fixture_id for update;
  if not found then return jsonb_build_object('error', 'fixture_not_found'); end if;
  if v_f.review_status <> 'approved' then
    return jsonb_build_object('skipped', true, 'reason', 'not_approved');
  end if;

  select * into v_m from public.football_markets where fixture_id = p_fixture_id;
  if not found then return jsonb_build_object('skipped', true, 'reason', 'no_market'); end if;
  if v_m.status in ('settled', 'void') then
    return jsonb_build_object('market_id', v_m.id, 'already_terminal', true);
  end if;

  if v_f.status_short = any(v_void_statuses) then
    return public.refund_football_market(v_m.id, 'match_' || lower(v_f.status_short));
  end if;

  if v_f.status_short = 'PST' then
    return jsonb_build_object('skipped', true, 'reason', 'postponed');
  end if;

  if not (v_f.status_short = any(v_terminal_statuses)) then
    return jsonb_build_object('skipped', true, 'reason', 'not_finished', 'status', v_f.status_short);
  end if;

  if v_f.goals_home is null or v_f.goals_away is null then
    return jsonb_build_object('error', 'missing_goals');
  end if;

  v_outcome := public.football_derive_outcome(v_f.goals_home, v_f.goals_away);

  update public.football_markets
  set status = 'closed', accept_bets = false, updated_at = now()
  where id = v_m.id and status not in ('settled', 'void');

  return public.settle_football_market(v_m.id, v_outcome, v_f.goals_home, v_f.goals_away);
end;
$$;

create or replace function public.cron_close_football_bets()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_closed int := 0;
begin
  update public.football_markets fm
  set accept_bets = false,
      status = case when fm.status = 'live' then 'closed' else fm.status end,
      updated_at = now()
  from public.football_fixtures f
  where fm.fixture_id = f.api_fixture_id
    and fm.status in ('live', 'closing')
    and (
      now() >= fm.betting_closes_at
      or f.status_short not in ('NS', 'TBD', 'PST')
    );

  get diagnostics v_closed = row_count;

  return jsonb_build_object('closed', v_closed);
end;
$$;

create or replace function public.list_football_markets_for_resolve()
returns setof bigint
language sql
security definer
set search_path = public
as $$
  select f.api_fixture_id
  from public.football_fixtures f
  join public.football_markets m on m.fixture_id = f.api_fixture_id
  where f.review_status = 'approved'
    and m.status not in ('settled', 'void', 'draft')
    and f.status_short in ('FT', 'AET', 'PEN', 'CANC', 'ABD', 'AWD', 'WO');
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.football_leagues enable row level security;
alter table public.football_fixtures enable row level security;
alter table public.football_markets enable row level security;
alter table public.football_bets enable row level security;
alter table public.football_market_resolutions enable row level security;

-- Leagues: public read enabled leagues
create policy "football_leagues_read"
  on public.football_leagues for select
  to anon, authenticated
  using (enabled = true);

create policy "football_leagues_admin"
  on public.football_leagues for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- Fixtures: public only approved
create policy "football_fixtures_read_approved"
  on public.football_fixtures for select
  to anon, authenticated
  using (review_status = 'approved');

create policy "football_fixtures_admin_read"
  on public.football_fixtures for select
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- Markets: public approved fixture + not draft
create policy "football_markets_read_public"
  on public.football_markets for select
  to anon, authenticated
  using (
    status <> 'draft'
    and exists (
      select 1 from public.football_fixtures f
      where f.api_fixture_id = fixture_id and f.review_status = 'approved'
    )
  );

create policy "football_markets_admin"
  on public.football_markets for select
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- Bets: own only
create policy "football_bets_read_own"
  on public.football_bets for select
  to authenticated
  using (auth.uid() = user_id);

create policy "football_bets_admin"
  on public.football_bets for select
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- Resolutions: authenticated read for settled markets
create policy "football_resolutions_read"
  on public.football_market_resolutions for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant execute on function public.upsert_football_fixture(
  bigint, int, int, timestamptz, text, int, text, int, text, int, int, text, text, text, jsonb
) to service_role;

grant execute on function public.cron_close_football_bets() to service_role;
grant execute on function public.list_football_markets_for_resolve() to service_role;
grant execute on function public.resolve_football_fixture(bigint) to service_role;

grant execute on function public.admin_list_football_pending(int) to authenticated;
grant execute on function public.admin_list_football_drafts(int) to authenticated;
grant execute on function public.admin_approve_football_fixture(bigint) to authenticated;
grant execute on function public.admin_reject_football_fixture(bigint, text) to authenticated;
grant execute on function public.admin_publish_football_market(text) to authenticated;
grant execute on function public.admin_void_football_market(text, text) to authenticated;

grant execute on function public.place_football_bet(text, public.football_outcome, numeric) to authenticated;
grant execute on function public.is_football_enabled() to anon, authenticated;

-- Dev seed: approved fixture + live market (e2e)
insert into public.football_fixtures (
  api_fixture_id, api_league_id, season, kickoff_at, status_short,
  home_team_id, home_team_name, away_team_id, away_team_name,
  goals_home, goals_away, review_status, reviewed_at
) values (
  999999001, 71, 2025, now() + interval '3 days', 'NS',
  126, 'São Paulo', 131, 'Corinthians',
  null, null, 'approved', now()
) on conflict (api_fixture_id) do update set review_status = 'approved';

insert into public.football_markets (
  id, fixture_id, question, status, accept_bets, betting_closes_at
) values (
  'fb-999999001',
  999999001,
  'São Paulo x Corinthians — resultado',
  'live',
  true,
  now() + interval '3 days'
) on conflict (fixture_id) do update set
  status = 'live',
  accept_bets = true;

-- Enable realtime for football_markets
alter publication supabase_realtime add table public.football_markets;
