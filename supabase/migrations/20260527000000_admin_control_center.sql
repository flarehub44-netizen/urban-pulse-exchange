-- Admin Control Center: metrics, settlement queue, finance, governance, cameras schema

create or replace function public.assert_admin()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin boolean;
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  select coalesce(is_admin, false) into v_admin from public.profiles where id = auth.uid();
  if not v_admin then raise exception 'Admin only'; end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- platform_settings
-- ---------------------------------------------------------------------------
create table if not exists public.platform_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles(id) on delete set null
);

alter table public.platform_settings enable row level security;
create policy "platform_settings_deny_all"
  on public.platform_settings for all to authenticated using (false);

insert into public.platform_settings (key, value) values
  ('house_fee_rate', '0.10'::jsonb),
  ('max_stake', '100000'::jsonb),
  ('market_duration_hours', '24'::jsonb),
  ('regions_enabled', 'true'::jsonb)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- admin_actions audit log
-- ---------------------------------------------------------------------------
create table if not exists public.admin_actions (
  id          bigserial primary key,
  admin_id    uuid not null references public.profiles(id) on delete cascade,
  action      text not null,
  target_type text,
  target_id   text,
  payload     jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists admin_actions_created_at on public.admin_actions (created_at desc);
alter table public.admin_actions enable row level security;
create policy "admin_actions_deny_all" on public.admin_actions for all to authenticated using (false);

-- ---------------------------------------------------------------------------
-- user_risk_profiles
-- ---------------------------------------------------------------------------
create table if not exists public.user_risk_profiles (
  user_id       uuid primary key references public.profiles(id) on delete cascade,
  risk_score    int not null default 0 check (risk_score between 0 and 100),
  kyc_status    text not null default 'none' check (kyc_status in ('none','pending','verified','rejected')),
  bet_limit     numeric,
  frozen        boolean not null default false,
  notes         text,
  updated_at    timestamptz not null default now()
);

alter table public.user_risk_profiles enable row level security;
create policy "user_risk_deny_all" on public.user_risk_profiles for all to authenticated using (false);

-- ---------------------------------------------------------------------------
-- cameras (phase 4 schema)
-- ---------------------------------------------------------------------------
create table if not exists public.cameras (
  id            text primary key default gen_random_uuid()::text,
  region_id     text references public.regions(id) on delete set null,
  name          text not null,
  location      text,
  status        text not null default 'offline' check (status in ('online','offline','paused')),
  stream_url    text,
  fps           int,
  detection_ok  boolean not null default false,
  count_line    jsonb,
  updated_at    timestamptz not null default now()
);

alter table public.cameras enable row level security;
create policy "cameras_deny_all" on public.cameras for all to authenticated using (false);

-- ---------------------------------------------------------------------------
-- get_admin_dashboard_metrics
-- ---------------------------------------------------------------------------
create or replace function public.get_admin_dashboard_metrics()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_vol_today numeric;
  v_revenue_today numeric;
  v_active int;
  v_dau int;
  v_open_pools numeric;
  v_disputes int;
  v_health jsonb;
begin
  perform public.assert_admin();

  select coalesce(sum(stake), 0) into v_vol_today
  from public.bets where created_at >= date_trunc('day', now() at time zone 'America/Sao_Paulo');

  select coalesce(sum(amount), 0) into v_revenue_today
  from public.platform_ledger
  where kind = 'house_fee' and created_at >= date_trunc('day', now() at time zone 'America/Sao_Paulo');

  select count(*)::int into v_active from public.markets
  where archived = false and status in ('live', 'closing');

  select count(distinct user_id)::int into v_dau from public.bets
  where created_at >= now() - interval '24 hours';

  select coalesce(sum(pool_yes + pool_no), 0) into v_open_pools
  from public.markets where status in ('live', 'closing', 'closed') and archived = false;

  select count(*)::int into v_disputes from public.markets where status = 'dispute';

  v_health := public.get_lifecycle_health();

  return jsonb_build_object(
    'volume_today', v_vol_today,
    'revenue_today', v_revenue_today,
    'active_markets', v_active,
    'dau', v_dau,
    'open_pools', v_open_pools,
    'dispute_count', v_disputes,
    'lifecycle', v_health
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- get_admin_volume_by_hour (last 24h)
-- ---------------------------------------------------------------------------
create or replace function public.get_admin_volume_by_hour()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_result jsonb;
begin
  perform public.assert_admin();
  select coalesce(jsonb_agg(row_to_json(t) order by t.hour), '[]'::jsonb) into v_result
  from (
    select date_trunc('hour', created_at) as hour,
           coalesce(sum(stake), 0)::numeric as volume
    from public.bets
    where created_at >= now() - interval '24 hours'
    group by 1
  ) t;
  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- get_admin_settlement_queue
-- ---------------------------------------------------------------------------
create or replace function public.get_admin_settlement_queue()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_result jsonb;
begin
  perform public.assert_admin();
  select coalesce(jsonb_agg(row_to_json(x) order by x.ends_at desc nulls last), '[]'::jsonb) into v_result
  from (
    select m.id, m.question, m.region, m.status, m.pool_yes, m.pool_no,
           m.resolved, m.ai_side, m.ends_at,
           (select count(*) from public.oracle_snapshots s where s.market_id = m.id) as snapshot_count,
           (select s.raw_value from public.oracle_snapshots s where s.market_id = m.id order by s.recorded_at desc limit 1) as last_oracle_value
    from public.markets m
    where m.status in ('closed', 'resolving', 'dispute', 'settled')
      and m.archived = false
    limit 100
  ) x;
  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- get_admin_finance_breakdown
-- ---------------------------------------------------------------------------
create or replace function public.get_admin_finance_breakdown()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_summary jsonb;
  v_by_region jsonb;
  v_by_kind jsonb;
begin
  perform public.assert_admin();
  v_summary := public.get_platform_ledger_summary();
  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_by_region
  from (
    select m.region, coalesce(sum(b.stake), 0)::numeric as volume
    from public.bets b
    join public.markets m on m.id = b.market_id
    where b.created_at >= date_trunc('day', now())
    group by m.region
  ) t;
  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_by_kind
  from (
    select kind, coalesce(sum(amount), 0)::numeric as total
    from public.platform_ledger
    group by kind
  ) t;
  return jsonb_build_object('summary', v_summary, 'by_region', v_by_region, 'by_kind', v_by_kind);
end;
$$;

-- ---------------------------------------------------------------------------
-- get_admin_oracle_health
-- ---------------------------------------------------------------------------
create or replace function public.get_admin_oracle_health()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_regions jsonb;
  v_recent jsonb;
  v_dispute_rate numeric;
begin
  perform public.assert_admin();
  select coalesce(jsonb_agg(row_to_json(r)), '[]'::jsonb) into v_regions
  from (
    select id, name, flow, avg_speed, congestion, updated_at from public.regions order by name
  ) r;
  select coalesce(jsonb_agg(row_to_json(s)), '[]'::jsonb) into v_recent
  from (
    select market_id, raw_value, metric, source, recorded_at
    from public.oracle_snapshots order by recorded_at desc limit 20
  ) s;
  select case when count(*) = 0 then 0
    else count(*) filter (where status = 'dispute')::numeric / count(*)::numeric
  end into v_dispute_rate
  from public.markets where status in ('settled', 'dispute', 'void');
  return jsonb_build_object('regions', v_regions, 'recent_snapshots', v_recent, 'dispute_rate', v_dispute_rate);
end;
$$;

-- ---------------------------------------------------------------------------
-- get_admin_users_list
-- ---------------------------------------------------------------------------
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
           coalesce((select sum(stake) from public.bets b where b.user_id = p.id), 0) as volume
    from public.profiles p
    left join public.user_risk_profiles urp on urp.user_id = p.id
    order by volume desc
    limit 200
  ) x;
  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- get_admin_risk_alerts (heuristics v1)
-- ---------------------------------------------------------------------------
create or replace function public.get_admin_risk_alerts()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_alerts jsonb := '[]'::jsonb;
begin
  perform public.assert_admin();
  select v_alerts || coalesce(jsonb_agg(jsonb_build_object(
    'type', 'volume_spike',
    'user_id', user_id,
    'username', (select username from public.profiles where id = user_id),
    'detail', 'Volume > 5000 nas últimas 24h',
    'severity', 'medium'
  )), '[]'::jsonb) into v_alerts
  from (
    select user_id, sum(stake) as vol
    from public.bets where created_at >= now() - interval '24 hours'
    group by user_id having sum(stake) > 5000
  ) q;
  return v_alerts;
end;
$$;

-- ---------------------------------------------------------------------------
-- get_admin_live_feed
-- ---------------------------------------------------------------------------
create or replace function public.get_admin_live_feed(p_limit int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_result jsonb;
begin
  perform public.assert_admin();
  select coalesce(jsonb_agg(row_to_json(x) order by x.at desc), '[]'::jsonb) into v_result
  from (
    select 'resolution' as kind, m.id as ref_id, m.question as message, m.updated_at as at
    from public.markets m where m.status = 'settled' and m.updated_at >= now() - interval '6 hours'
    union all
    select 'dispute', m.id, m.question, m.updated_at
    from public.markets m where m.status = 'dispute'
    order by at desc
    limit greatest(1, least(p_limit, 50))
  ) x;
  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- admin_force_close
-- ---------------------------------------------------------------------------
create or replace function public.admin_force_close(p_market_id text, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();
  update public.markets
  set status = 'closed', accept_bets = false, updated_at = now()
  where id = p_market_id and status in ('live', 'closing');
  if not found then raise exception 'Market not found or not closable'; end if;
  insert into public.admin_actions (admin_id, action, target_type, target_id, payload)
  values (auth.uid(), 'force_close', 'market', p_market_id, jsonb_build_object('note', p_note));
  return jsonb_build_object('ok', true, 'market_id', p_market_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- admin_reprocess_market
-- ---------------------------------------------------------------------------
create or replace function public.admin_reprocess_market(p_market_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n int;
begin
  perform public.assert_admin();
  v_n := public.seed_oracle_snapshots_for_market(p_market_id, 3);
  insert into public.admin_actions (admin_id, action, target_type, target_id, payload)
  values (auth.uid(), 'reprocess_oracle', 'market', p_market_id, jsonb_build_object('snapshots', v_n));
  return jsonb_build_object('ok', true, 'snapshots_seeded', v_n);
end;
$$;

-- ---------------------------------------------------------------------------
-- admin_update_setting
-- ---------------------------------------------------------------------------
create or replace function public.admin_update_setting(p_key text, p_value jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();
  if p_key not in ('house_fee_rate', 'max_stake', 'market_duration_hours', 'regions_enabled') then
    raise exception 'Invalid setting key';
  end if;
  insert into public.platform_settings (key, value, updated_by)
  values (p_key, p_value, auth.uid())
  on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by;
  insert into public.admin_actions (admin_id, action, target_type, target_id, payload)
  values (auth.uid(), 'update_setting', 'platform_settings', p_key, p_value);
  return jsonb_build_object('ok', true, 'key', p_key);
end;
$$;

-- ---------------------------------------------------------------------------
-- admin_freeze_account / admin_set_bet_limit
-- ---------------------------------------------------------------------------
create or replace function public.admin_freeze_account(p_user_id uuid, p_frozen boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();
  insert into public.user_risk_profiles (user_id, frozen)
  values (p_user_id, p_frozen)
  on conflict (user_id) do update set frozen = p_frozen, updated_at = now();
  insert into public.admin_actions (admin_id, action, target_type, target_id, payload)
  values (auth.uid(), 'freeze_account', 'profile', p_user_id::text, jsonb_build_object('frozen', p_frozen));
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_set_bet_limit(p_user_id uuid, p_limit numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();
  insert into public.user_risk_profiles (user_id, bet_limit)
  values (p_user_id, p_limit)
  on conflict (user_id) do update set bet_limit = p_limit, updated_at = now();
  insert into public.admin_actions (admin_id, action, target_type, target_id, payload)
  values (auth.uid(), 'set_bet_limit', 'profile', p_user_id::text, jsonb_build_object('limit', p_limit));
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- admin_list_cameras / admin_upsert_camera
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_cameras()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_result jsonb;
begin
  perform public.assert_admin();
  select coalesce(jsonb_agg(row_to_json(c) order by c.name), '[]'::jsonb) into v_result from public.cameras c;
  return v_result;
end;
$$;

create or replace function public.admin_upsert_camera(
  p_id text,
  p_region_id text,
  p_name text,
  p_location text default null,
  p_status text default 'offline',
  p_stream_url text default null,
  p_count_line jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();
  insert into public.cameras (id, region_id, name, location, status, stream_url, count_line)
  values (coalesce(p_id, gen_random_uuid()::text), p_region_id, p_name, p_location, p_status, p_stream_url, p_count_line)
  on conflict (id) do update set
    region_id = excluded.region_id,
    name = excluded.name,
    location = excluded.location,
    status = excluded.status,
    stream_url = excluded.stream_url,
    count_line = excluded.count_line,
    updated_at = now();
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.get_platform_settings_admin()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_result jsonb;
begin
  perform public.assert_admin();
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into v_result from public.platform_settings;
  return v_result;
end;
$$;

-- Grants
grant execute on function public.get_admin_dashboard_metrics() to authenticated;
grant execute on function public.get_admin_volume_by_hour() to authenticated;
grant execute on function public.get_admin_settlement_queue() to authenticated;
grant execute on function public.get_admin_finance_breakdown() to authenticated;
grant execute on function public.get_admin_oracle_health() to authenticated;
grant execute on function public.get_admin_users_list() to authenticated;
grant execute on function public.get_admin_risk_alerts() to authenticated;
grant execute on function public.get_admin_live_feed(int) to authenticated;
grant execute on function public.admin_force_close(text, text) to authenticated;
grant execute on function public.admin_reprocess_market(text) to authenticated;
grant execute on function public.admin_update_setting(text, jsonb) to authenticated;
grant execute on function public.admin_freeze_account(uuid, boolean) to authenticated;
grant execute on function public.admin_set_bet_limit(uuid, numeric) to authenticated;
grant execute on function public.admin_list_cameras() to authenticated;
grant execute on function public.admin_upsert_camera(text, text, text, text, text, text, jsonb) to authenticated;
grant execute on function public.get_platform_settings_admin() to authenticated;
