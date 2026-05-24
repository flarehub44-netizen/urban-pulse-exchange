-- Football gaps: rate limit, logos, regulation scores, admin_list_live, acceptance helper

drop function if exists public.upsert_football_fixture(
  bigint, int, int, timestamptz, text, int, text, int, text, int, int, text, text, text, jsonb
);

alter table public.football_fixtures
  add column if not exists home_logo_url text,
  add column if not exists away_logo_url text,
  add column if not exists goals_home_ht int,
  add column if not exists goals_away_ht int;

-- ---------------------------------------------------------------------------
-- place_football_bet with rate limit (replaces prior version)
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
  v_recent_bets int;
begin
  if v_user_id is null then raise exception 'Unauthorized'; end if;
  if not public.is_football_enabled() then raise exception 'Football markets disabled'; end if;
  if p_stake <= 0 then raise exception 'Stake must be positive'; end if;
  if p_stake > 100000 then raise exception 'Stake cannot exceed 100.000 BRL'; end if;

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
-- upsert_football_fixture (logos + HT goals for regulation)
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
  p_raw jsonb default '{}',
  p_home_logo_url text default null,
  p_away_logo_url text default null,
  p_goals_home_ht int default null,
  p_goals_away_ht int default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.football_fixtures%rowtype;
  v_close_min int;
  v_reg text;
  v_gh int;
  v_ga int;
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

  v_reg := trim(both '"' from coalesce(
    (select value #>> '{}' from public.platform_settings where key = 'football_regulation'),
    '90min'
  ));

  v_gh := p_goals_home;
  v_ga := p_goals_away;
  if v_reg = '90min' and p_goals_home_ht is not null and p_goals_away_ht is not null then
    v_gh := p_goals_home_ht;
    v_ga := p_goals_away_ht;
  end if;

  insert into public.football_fixtures (
    api_fixture_id, api_league_id, season, kickoff_at, status_short,
    home_team_id, home_team_name, away_team_id, away_team_name,
    goals_home, goals_away, goals_home_ht, goals_away_ht,
    venue, home_logo_url, away_logo_url, raw_payload, synced_at,
    review_status
  ) values (
    p_api_fixture_id, p_api_league_id, p_season, p_kickoff_at, p_status_short,
    p_home_team_id, p_home_team_name, p_away_team_id, p_away_team_name,
    v_gh, v_ga, p_goals_home_ht, p_goals_away_ht,
    p_venue, p_home_logo_url, p_away_logo_url, coalesce(p_raw, '{}'), now(),
    case when found then v_existing.review_status else 'pending_review'::public.football_review_status end
  )
  on conflict (api_fixture_id) do update set
    kickoff_at = excluded.kickoff_at,
    status_short = excluded.status_short,
    goals_home = coalesce(excluded.goals_home, football_fixtures.goals_home),
    goals_away = coalesce(excluded.goals_away, football_fixtures.goals_away),
    goals_home_ht = coalesce(excluded.goals_home_ht, football_fixtures.goals_home_ht),
    goals_away_ht = coalesce(excluded.goals_away_ht, football_fixtures.goals_away_ht),
    venue = coalesce(excluded.venue, football_fixtures.venue),
    home_logo_url = coalesce(excluded.home_logo_url, football_fixtures.home_logo_url),
    away_logo_url = coalesce(excluded.away_logo_url, football_fixtures.away_logo_url),
    raw_payload = excluded.raw_payload,
    synced_at = now();

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

grant execute on function public.upsert_football_fixture(
  bigint, int, int, timestamptz, text, int, text, int, text, int, int, text, text, text, jsonb, text, text, int, int
) to service_role;

-- ---------------------------------------------------------------------------
-- admin_list_football_live
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_football_live(p_limit int default 50)
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
    'pool_home', fm.pool_home,
    'pool_draw', fm.pool_draw,
    'pool_away', fm.pool_away,
    'participants', fm.participants,
    'winning_outcome', fm.winning_outcome,
    'kickoff_at', f.kickoff_at,
    'home_team_name', f.home_team_name,
    'away_team_name', f.away_team_name,
    'status_short', f.status_short
  )
  from public.football_markets fm
  join public.football_fixtures f on f.api_fixture_id = fm.fixture_id
  where f.review_status = 'approved'
    and fm.status in ('live', 'closing', 'closed', 'settled', 'void')
  order by f.kickoff_at desc
  limit greatest(1, least(p_limit, 200));
end;
$$;

grant execute on function public.admin_list_football_live(int) to authenticated;

-- ---------------------------------------------------------------------------
-- Internal bet placement (acceptance / service role only)
-- ---------------------------------------------------------------------------
create or replace function public.place_football_bet_as(
  p_user_id uuid,
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
  if p_stake <= 0 then raise exception 'Stake must be positive'; end if;

  select * into v_profile from public.profiles where id = p_user_id for update;
  if not found then raise exception 'Profile not found'; end if;
  if v_profile.balance < p_stake then raise exception 'Insufficient balance'; end if;

  select * into v_m from public.football_markets where id = p_market_id for update;
  if not found then raise exception 'Market not found'; end if;

  select * into v_f from public.football_fixtures where api_fixture_id = v_m.fixture_id;
  if v_f.review_status <> 'approved' then raise exception 'Fixture not approved'; end if;
  if v_m.status not in ('live', 'closing') or not v_m.accept_bets then
    raise exception 'Market does not accept bets';
  end if;

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
  where id = p_user_id;

  update public.football_markets
  set pool_home = v_new_home, pool_draw = v_new_draw, pool_away = v_new_away,
      participants = participants + 1, updated_at = now()
  where id = p_market_id;

  insert into public.football_bets (user_id, market_id, outcome, stake, share)
  values (p_user_id, p_market_id, p_outcome, p_stake, v_share)
  returning id into v_bet_id;

  insert into public.transactions (
    user_id, type, market_id, market_label, amount, before_balance, after_balance
  )
  values (
    p_user_id, 'entry', p_market_id, v_m.question, p_stake,
    v_profile.balance, v_profile.balance - p_stake
  )
  returning id into v_tx_id;

  return jsonb_build_object(
    'bet_id', v_bet_id,
    'tx_id', v_tx_id,
    'pool_home', v_new_home,
    'balance', v_profile.balance - p_stake
  );
end;
$$;

grant execute on function public.place_football_bet_as(uuid, text, public.football_outcome, numeric) to service_role;

-- ---------------------------------------------------------------------------
-- Acceptance flow (service role / CI only)
-- ---------------------------------------------------------------------------
create or replace function public.football_run_acceptance_flow()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_fixture_id bigint := 999999003;
  v_market_id text := 'fb-999999003';
  v_balance_before numeric;
  v_balance_after numeric;
  v_bet_result jsonb;
  v_resolve jsonb;
  v_payout numeric;
begin
  select id into v_uid from public.profiles order by created_at limit 1;
  if v_uid is null then
    raise exception 'football_acceptance: no profiles in database';
  end if;

  delete from public.football_bets where market_id = v_market_id;
  delete from public.football_markets where id = v_market_id;
  delete from public.football_fixtures where api_fixture_id = v_fixture_id;

  insert into public.football_fixtures (
    api_fixture_id, api_league_id, season, kickoff_at, status_short,
    home_team_id, home_team_name, away_team_id, away_team_name,
    review_status, goals_home, goals_away
  ) values (
    v_fixture_id, 71, 2025, now() + interval '2 days', 'NS',
    1, 'Acceptance Home', 2, 'Acceptance Away',
    'approved', null, null
  );

  insert into public.football_markets (
    id, fixture_id, question, status, accept_bets, betting_closes_at
  ) values (
    v_market_id, v_fixture_id, 'Acceptance Home x Acceptance Away — resultado',
    'live', true, now() + interval '2 days'
  );

  select balance into v_balance_before from public.profiles where id = v_uid;
  update public.profiles set balance = greatest(balance, 5000) where id = v_uid;

  v_bet_result := public.place_football_bet_as(v_uid, v_market_id, 'HOME'::public.football_outcome, 100);

  update public.football_fixtures
  set status_short = 'FT', goals_home = 2, goals_away = 1
  where api_fixture_id = v_fixture_id;

  v_resolve := public.resolve_football_fixture(v_fixture_id);

  if (v_resolve->>'status') is distinct from 'settled' then
    raise exception 'expected settled, got %', v_resolve;
  end if;

  select payout into v_payout
  from public.football_bets
  where market_id = v_market_id and user_id = v_uid
  order by created_at desc
  limit 1;

  if v_payout is null or v_payout <= 0 then
    raise exception 'expected positive payout for HOME winner';
  end if;

  select balance into v_balance_after from public.profiles where id = v_uid;

  return jsonb_build_object(
    'ok', true,
    'user_id', v_uid,
    'bet', v_bet_result,
    'resolve', v_resolve,
    'payout', v_payout,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after
  );
end;
$$;

grant execute on function public.football_run_acceptance_flow() to service_role;
