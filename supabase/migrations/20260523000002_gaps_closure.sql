-- Gaps closure: create/open market, oracle snapshots, refund stats, production telemetry

-- ---------------------------------------------------------------------------
-- oracle_snapshots
-- ---------------------------------------------------------------------------
create table if not exists public.oracle_snapshots (
  id          bigserial primary key,
  market_id   text not null references public.markets(id) on delete cascade,
  region_id   text references public.regions(id) on delete set null,
  raw_value   numeric not null,
  metric      text not null,
  source      text not null default 'regions',
  recorded_at timestamptz not null default now()
);
create index if not exists oracle_snapshots_market_time
  on public.oracle_snapshots(market_id, recorded_at desc);

alter table public.oracle_snapshots enable row level security;
create policy "oracle_snapshots_read_authenticated"
  on public.oracle_snapshots for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Record snapshot from regions (production path — no random nudge)
-- ---------------------------------------------------------------------------
create or replace function public.record_oracle_snapshot(p_market_id text)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market markets%rowtype;
  v_region regions%rowtype;
  v_metric text;
  v_raw    numeric;
begin
  select * into v_market from public.markets where id = p_market_id;
  if v_market.region_id is null then return null; end if;

  select * into v_region from public.regions where id = v_market.region_id;
  if not found then return null; end if;

  v_metric := coalesce(
    v_market.resolution_metric,
    case v_market.category
      when 'Fluxo' then 'flow'
      when 'Velocidade' then 'avg_speed'
      else 'flow'
    end
  );

  v_raw := public.oracle_raw_metric(
    v_metric, v_region.flow, v_region.avg_speed, v_region.congestion
  );

  insert into public.oracle_snapshots (
    market_id, region_id, raw_value, metric, source
  ) values (
    p_market_id, v_region.id, v_raw, v_metric, coalesce(v_market.data_source, 'regions')
  );

  return v_raw;
end;
$$;

-- Snapshot all active markets (called from tick)
create or replace function public.ingest_oracle_snapshots()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row  record;
  v_count int := 0;
begin
  for v_row in
    select id from public.markets
    where status in ('live', 'closing', 'closed', 'resolving')
      and region_id is not null
  loop
    perform public.record_oracle_snapshot(v_row.id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- create_market (admin, draft)
-- ---------------------------------------------------------------------------
create or replace function public.create_market(
  p_id              text,
  p_question        text,
  p_region          text,
  p_target          numeric,
  p_category        market_category,
  p_ends_at         timestamptz,
  p_region_id       text,
  p_resolution_metric text default null,
  p_comparison_op   text default null,
  p_ai_side         bet_side default 'YES',
  p_ai_value        numeric default 0,
  p_ai_confidence   numeric default 0.85,
  p_data_source     text default 'regions'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_admin boolean;
  v_metric text;
  v_op text;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  select is_admin into v_admin from public.profiles where id = v_uid;
  if not coalesce(v_admin, false) then raise exception 'Admin only'; end if;

  v_metric := coalesce(p_resolution_metric,
    case p_category when 'Velocidade' then 'avg_speed' else 'flow' end);
  v_op := coalesce(p_comparison_op,
    case p_category when 'Velocidade' then 'lt' else 'gt' end);

  insert into public.markets (
    id, question, region, target, category, ends_at,
    status, accept_bets, region_id, resolution_metric, comparison_op,
    ai_side, ai_value, ai_confidence, data_source, starts_at
  ) values (
    p_id, p_question, p_region, p_target, p_category, p_ends_at,
    'draft', false, p_region_id, v_metric, v_op,
    p_ai_side, p_ai_value, p_ai_confidence, p_data_source, now()
  );

  return jsonb_build_object('market_id', p_id, 'status', 'draft');
end;
$$;

-- ---------------------------------------------------------------------------
-- open_market (admin): optional 5% rule when pools already have volume
-- ---------------------------------------------------------------------------
create or replace function public.open_market(
  p_market_id text,
  p_min_minority_ratio numeric default 0.05
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_admin boolean;
  v_market markets%rowtype;
  v_total numeric;
  v_min numeric;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  select is_admin into v_admin from public.profiles where id = v_uid;
  if not coalesce(v_admin, false) then raise exception 'Admin only'; end if;

  select * into v_market from public.markets where id = p_market_id for update;
  if not found then raise exception 'Market not found'; end if;
  if v_market.status not in ('draft') then
    raise exception 'Market must be draft to open (status=%)', v_market.status;
  end if;
  if v_market.frozen then raise exception 'Market is frozen'; end if;

  v_total := v_market.pool_yes + v_market.pool_no;
  if v_total > 0 then
    v_min := least(v_market.pool_yes, v_market.pool_no);
    if (v_min / v_total) < p_min_minority_ratio then
      raise exception 'Insufficient liquidity: minority side below %',
        (p_min_minority_ratio * 100)::text;
    end if;
  end if;

  update public.markets
  set status = 'live', accept_bets = true, updated_at = now()
  where id = p_market_id;

  return jsonb_build_object('market_id', p_market_id, 'status', 'live');
end;
$$;

grant execute on function public.create_market(
  text, text, text, numeric, market_category, timestamptz, text, text, text, bet_side, numeric, numeric, text
) to authenticated;
grant execute on function public.open_market(text, numeric) to authenticated;

-- ---------------------------------------------------------------------------
-- refund_market: refresh participant stats
-- ---------------------------------------------------------------------------
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
  v_bet    record;
  v_count  int := 0;
  v_total  numeric := 0;
  v_result jsonb;
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
    update public.profiles set balance = balance + v_bet.stake where id = v_bet.user_id;
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
end;
$$;

-- ---------------------------------------------------------------------------
-- validate_oracle_reading: sanity on raw metric from snapshots
-- ---------------------------------------------------------------------------
create or replace function public.validate_oracle_reading(
  p_market_id text,
  p_resolution_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market markets%rowtype;
  v_res    market_resolutions%rowtype;
  v_checks jsonb := '{}'::jsonb;
  v_pass   boolean := true;
  v_sanity numeric;
  v_hist_avg numeric;
  v_hist_n   int;
  v_snap_avg numeric;
  v_snap_n   int;
  v_min_snaps int := 3;
begin
  select * into v_market from public.markets where id = p_market_id;
  select * into v_res from public.market_resolutions where id = p_resolution_id;

  if v_res.raw_value is null then
    v_checks := v_checks || jsonb_build_object('consistency', false);
    v_pass := false;
  else
    v_checks := v_checks || jsonb_build_object('consistency', true);
  end if;

  if v_res.raw_value is not null and v_res.raw_value = v_market.target then
    v_checks := v_checks || jsonb_build_object('tie', true);
    v_pass := false;
  else
    v_checks := v_checks || jsonb_build_object('tie', false);
  end if;

  select avg(raw_value), count(*) into v_snap_avg, v_snap_n
  from public.oracle_snapshots
  where market_id = p_market_id
    and recorded_at >= coalesce(v_market.starts_at, v_market.created_at);

  v_checks := v_checks || jsonb_build_object('snapshot_count', coalesce(v_snap_n, 0));

  if coalesce(v_snap_n, 0) < v_min_snaps then
    v_checks := v_checks || jsonb_build_object('window_data', false);
    v_pass := false;
  else
    v_checks := v_checks || jsonb_build_object('window_data', true);
    if v_snap_avg > 0 then
      v_sanity := abs(v_res.raw_value - v_snap_avg) / v_snap_avg;
      v_checks := v_checks || jsonb_build_object(
        'sanity_source', 'oracle_snapshots',
        'sanity_ratio', v_sanity,
        'sanity', v_sanity <= 0.35
      );
      if v_sanity > 0.35 then v_pass := false; end if;
    end if;
  end if;

  select avg(p), count(*) into v_hist_avg, v_hist_n
  from public.market_history
  where market_id = p_market_id and recorded_at >= now() - interval '7 days';

  if v_hist_n >= 3 and v_hist_avg is not null then
    if abs(v_hist_avg - 0.5) > 0.25
       and (v_hist_avg > 0.5) is distinct from (v_res.derived_side = 'YES') then
      v_checks := v_checks || jsonb_build_object('crowd_conflict', true);
      v_pass := false;
    end if;
  end if;

  v_checks := v_checks || jsonb_build_object(
    'confidence', coalesce(v_res.confidence, 0) >= public.min_oracle_confidence(),
    'confidence_value', v_res.confidence
  );
  if coalesce(v_res.confidence, 0) < public.min_oracle_confidence() then
    v_pass := false;
  end if;

  update public.market_resolutions
  set validation = v_checks,
      status = case when v_pass then 'validated' else 'disputed' end
  where id = p_resolution_id;

  return jsonb_build_object('pass', v_pass, 'checks', v_checks);
end;
$$;

-- collect: record final snapshot at resolution time
create or replace function public.collect_oracle_reading(p_market_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market   markets%rowtype;
  v_raw      numeric;
  v_side     bet_side;
  v_conf     numeric;
  v_res_id   uuid;
  v_metric   text;
  v_region   regions%rowtype;
begin
  select * into v_market from public.markets where id = p_market_id for update;
  if not found then raise exception 'Market not found'; end if;

  if v_market.region_id is null then
    return jsonb_build_object('error', 'missing_region_id');
  end if;

  v_raw := public.record_oracle_snapshot(p_market_id);
  if v_raw is null then
    return jsonb_build_object('error', 'region_not_found');
  end if;

  select * into v_region from public.regions where id = v_market.region_id;

  v_metric := coalesce(v_market.resolution_metric, 'flow');
  v_side := public.oracle_derive_side(
    v_raw, v_market.target,
    coalesce(v_market.comparison_op,
      case v_market.category when 'Velocidade' then 'lt' else 'gt' end)
  );

  v_conf := least(
    1.0,
    greatest(
      public.min_oracle_confidence(),
      v_market.ai_confidence * 0.7
        + (1 - abs(v_raw - v_market.ai_value) / greatest(v_market.ai_value, 1)) * 0.3
    )
  );

  insert into public.market_resolutions (
    market_id, status, raw_value, derived_side, confidence,
    model_version, source, inputs
  ) values (
    p_market_id, 'submitted', v_raw, v_side, v_conf,
    'urbanmind-regions-v2',
    coalesce(v_market.data_source, 'regions'),
    jsonb_build_object(
      'region', row_to_json(v_region),
      'metric', v_metric,
      'target', v_market.target,
      'pools', jsonb_build_object('yes', v_market.pool_yes, 'no', v_market.pool_no)
    )
  )
  returning id into v_res_id;

  return jsonb_build_object(
    'resolution_id', v_res_id,
    'raw_value', v_raw,
    'derived_side', v_side,
    'confidence', v_conf
  );
end;
$$;

-- process: no demo telemetry nudge
create or replace function public.process_market_resolution(p_market_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market markets%rowtype;
  v_reading jsonb;
  v_val     jsonb;
  v_res_id  uuid;
  v_side    bet_side;
begin
  select * into v_market from public.markets where id = p_market_id for update;
  if not found then raise exception 'Market not found'; end if;

  if v_market.status not in ('closed', 'resolving') then
    return jsonb_build_object('skipped', true, 'status', v_market.status);
  end if;

  update public.markets
  set status = 'resolving', accept_bets = false, updated_at = now()
  where id = p_market_id;

  v_reading := public.collect_oracle_reading(p_market_id);

  if v_reading ? 'error' then
    update public.markets set status = 'void', updated_at = now() where id = p_market_id;
    return public.refund_market(p_market_id, v_reading->>'error');
  end if;

  v_res_id := (v_reading->>'resolution_id')::uuid;
  v_val := public.validate_oracle_reading(p_market_id, v_res_id);

  if not (v_val->>'pass')::boolean then
    update public.markets set status = 'dispute', updated_at = now() where id = p_market_id;
    return jsonb_build_object('market_id', p_market_id, 'status', 'dispute', 'validation', v_val);
  end if;

  select derived_side into v_side from public.market_resolutions where id = v_res_id;
  return public.settle_market(p_market_id, v_side, v_res_id);
end;
$$;

-- tick: ingest snapshots + skip draft
create or replace function public.tick_market_lifecycle()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row    record;
  v_closed int := 0;
  v_resolved int := 0;
  v_closing int := 0;
  v_snaps  int := 0;
begin
  v_snaps := public.ingest_oracle_snapshots();

  update public.markets
  set status = 'closing', updated_at = now()
  where status = 'live' and accept_bets = true
    and ends_at > now()
    and ends_at <= now() + interval '30 minutes';
  get diagnostics v_closing = row_count;

  update public.markets
  set status = 'closed', accept_bets = false, updated_at = now()
  where status in ('live', 'closing') and ends_at <= now();
  get diagnostics v_closed = row_count;

  for v_row in
    select id from public.markets where status = 'closed' for update skip locked
  loop
    perform public.process_market_resolution(v_row.id);
    v_resolved := v_resolved + 1;
  end loop;

  return jsonb_build_object(
    'snapshots', v_snaps,
    'closing_promoted', v_closing,
    'closed', v_closed,
    'processed', v_resolved
  );
end;
$$;

-- place_bet: block draft
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
  if v_user_id is null then raise exception 'Unauthorized'; end if;

  select * into v_profile from public.profiles where id = v_user_id for update;
  if not found then raise exception 'Profile not found'; end if;
  if p_stake <= 0 then raise exception 'Stake must be positive'; end if;
  if v_profile.balance < p_stake then raise exception 'Insufficient balance'; end if;

  select * into v_market from public.markets where id = p_market_id for update;
  if not found then raise exception 'Market not found'; end if;

  if v_market.frozen then raise exception 'Market is frozen'; end if;
  if v_market.status = 'draft' then raise exception 'Market not open yet (draft)'; end if;
  if v_market.status not in ('live', 'closing') then
    raise exception 'Market not accepting bets (status=%)', v_market.status;
  end if;
  if not v_market.accept_bets then raise exception 'Market closed for entries'; end if;
  if now() >= v_market.ends_at then raise exception 'Market entry window ended'; end if;

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
  set balance = balance - p_stake, volume_24h = volume_24h + p_stake
  where id = v_user_id;

  update public.markets
  set pool_yes = v_new_pool_yes, pool_no = v_new_pool_no, participants = participants + 1
  where id = p_market_id;

  insert into public.bets (user_id, market_id, side, stake, share)
  values (v_user_id, p_market_id, p_side, p_stake, v_share)
  returning id into v_bet_id;

  insert into public.transactions (user_id, type, market_id, market_label, amount)
  values (v_user_id, 'entry', p_market_id, v_market.region, p_stake)
  returning id into v_tx_id;

  return jsonb_build_object(
    'bet_id', v_bet_id, 'tx_id', v_tx_id,
    'pool_yes', v_new_pool_yes, 'pool_no', v_new_pool_no,
    'balance', v_profile.balance - p_stake
  );
end;
$$;

-- RPC: list audit data for market detail
create or replace function public.get_market_audit(p_market_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_resolutions jsonb;
  v_ledger jsonb;
  v_snaps jsonb;
begin
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', r.id, 'status', r.status, 'raw_value', r.raw_value,
      'derived_side', r.derived_side, 'confidence', r.confidence,
      'source', r.source, 'validation', r.validation,
      'payout_summary', r.payout_summary, 'created_at', r.created_at
    ) order by r.created_at desc
  ), '[]'::jsonb) into v_resolutions
  from public.market_resolutions r where r.market_id = p_market_id;

  select coalesce(jsonb_agg(
    jsonb_build_object('amount', l.amount, 'kind', l.kind, 'meta', l.meta, 'created_at', l.created_at)
    order by l.created_at desc
  ), '[]'::jsonb) into v_ledger
  from public.platform_ledger l where l.market_id = p_market_id;

  select coalesce(jsonb_agg(
    jsonb_build_object('raw_value', s.raw_value, 'metric', s.metric, 'recorded_at', s.recorded_at)
    order by s.recorded_at desc
  ), '[]'::jsonb) into v_snaps
  from (
    select raw_value, metric, recorded_at
    from public.oracle_snapshots
    where market_id = p_market_id
    order by recorded_at desc
    limit 30
  ) s;

  return jsonb_build_object(
    'resolutions', v_resolutions,
    'ledger', v_ledger,
    'snapshots', v_snaps
  );
end;
$$;

grant execute on function public.get_market_audit(text) to authenticated;

-- Drop demo-only function
drop function if exists public.sync_region_telemetry_for_market(text);
