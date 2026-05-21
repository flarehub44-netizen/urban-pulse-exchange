-- ViaX resolution engine: lifecycle states, oracle (regions), settlement, audit, pg_cron
-- (enum values in 20260522000000_resolution_enums.sql)

-- Migrate legacy terminal status
update public.markets set status = 'settled' where status = 'resolved';

-- ---------------------------------------------------------------------------
-- markets columns
-- ---------------------------------------------------------------------------
alter table public.markets
  add column if not exists starts_at timestamptz,
  add column if not exists accept_bets boolean not null default true,
  add column if not exists region_id text references public.regions(id) on delete set null,
  add column if not exists resolution_metric text,
  add column if not exists comparison_op text check (comparison_op is null or comparison_op in ('gt', 'lt', 'gte', 'lte')),
  add column if not exists data_source text not null default 'regions',
  add column if not exists resolved_at timestamptz,
  add column if not exists settled_at timestamptz,
  add column if not exists house_fee_pct numeric(5,4) not null default 0.10
    check (house_fee_pct >= 0 and house_fee_pct < 1),
  add column if not exists frozen boolean not null default false;

update public.markets set starts_at = created_at where starts_at is null;

-- Backfill region_id + resolution_metric + comparison_op
update public.markets m set
  region_id = v.region_id,
  resolution_metric = v.metric,
  comparison_op = v.op
from (values
  ('paulista-rush',   'paulista',    'flow',       'gt'),
  ('marginal-tietê',  'marginal',    'avg_speed',  'lt'),
  ('faria-lima',      'fariaLima',   'flow',       'gt'),
  ('23-maio',         'marginal',    'flow',       'gt'),
  ('rebouças',        'pinheiros',   'avg_speed',  'lt'),
  ('anhangabaú',      'centro',      'flow',       'gt'),
  ('imigrantes',      'marginal',    'avg_speed',  'gt'),
  ('brigadeiro',      'vilaMariana', 'flow',       'gt')
) as v(id, region_id, metric, op)
where m.id = v.id;

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- ---------------------------------------------------------------------------
-- market_resolutions (audit)
-- ---------------------------------------------------------------------------
create table if not exists public.market_resolutions (
  id              uuid primary key default gen_random_uuid(),
  market_id       text not null references public.markets(id) on delete cascade,
  status          text not null check (status in (
    'submitted', 'validated', 'disputed', 'voided', 'settled'
  )),
  raw_value       numeric,
  derived_side    bet_side,
  confidence      numeric(4,3) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  model_version   text not null default 'urbanmind-regions-v1',
  source          text not null default 'regions',
  inputs          jsonb not null default '{}',
  validation      jsonb not null default '{}',
  payout_summary  jsonb,
  created_at      timestamptz not null default now()
);
create index if not exists market_resolutions_market_id_created
  on public.market_resolutions(market_id, created_at desc);

alter table public.market_resolutions enable row level security;

create policy "market_resolutions_read_authenticated"
  on public.market_resolutions for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Constants (mirror src/lib/parimutuel.ts)
-- ---------------------------------------------------------------------------
create or replace function public.min_minority_ratio()
returns numeric language sql immutable as $$ select 0.05::numeric $$;

create or replace function public.min_oracle_confidence()
returns numeric language sql immutable as $$ select 0.85::numeric $$;

-- ---------------------------------------------------------------------------
-- Immutability: settled/void markets
-- ---------------------------------------------------------------------------
create or replace function public.guard_market_mutation()
returns trigger
language plpgsql
as $$
begin
  if old.status in ('settled', 'void') then
    if new.pool_yes is distinct from old.pool_yes
       or new.pool_no is distinct from old.pool_no
       or new.status is distinct from old.status
       or new.accept_bets is distinct from old.accept_bets then
      raise exception 'Market % is immutable (status=%)', old.id, old.status;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_markets_immutable on public.markets;
create trigger trg_markets_immutable
  before update on public.markets
  for each row execute function public.guard_market_mutation();

-- ---------------------------------------------------------------------------
-- Pool validation → settle | void
-- ---------------------------------------------------------------------------
create or replace function public.validate_market_pools(
  p_pool_yes numeric,
  p_pool_no numeric,
  p_winning_side bet_side
)
returns text
language plpgsql
immutable
as $$
declare
  v_total   numeric;
  v_min     numeric;
  v_pool_win numeric;
begin
  v_total := coalesce(p_pool_yes, 0) + coalesce(p_pool_no, 0);
  if p_winning_side = 'YES' then v_pool_win := coalesce(p_pool_yes, 0);
  else v_pool_win := coalesce(p_pool_no, 0);
  end if;

  if v_pool_win <= 0 then
    return 'void';
  end if;

  v_min := least(coalesce(p_pool_yes, 0), coalesce(p_pool_no, 0));

  if v_min = 0 then
    if p_winning_side = 'YES' and coalesce(p_pool_no, 0) = 0 then
      return 'settle';
    end if;
    if p_winning_side = 'NO' and coalesce(p_pool_yes, 0) = 0 then
      return 'settle';
    end if;
    return 'void';
  end if;

  if v_total > 0 and (v_min / v_total) < public.min_minority_ratio() then
    return 'void';
  end if;

  return 'settle';
end;
$$;

-- ---------------------------------------------------------------------------
-- refund_market
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
      v_bet.user_id,
      'refund',
      'Reembolso de ' || v_bet.stake::text || ' — ' || coalesce(p_reason, 'mercado cancelado'),
      p_market_id
    );
    v_count := v_count + 1;
    v_total := v_total + v_bet.stake;
  end loop;

  update public.markets
  set status = 'void',
      accept_bets = false,
      resolved_at = coalesce(resolved_at, now()),
      settled_at = now(),
      updated_at = now()
  where id = p_market_id;

  insert into public.market_resolutions (
    market_id, status, source, validation, payout_summary
  ) values (
    p_market_id,
    'voided',
    coalesce(v_market.data_source, 'system'),
    jsonb_build_object('reason', p_reason),
    jsonb_build_object('refunds', v_count, 'total_refunded', v_total)
  );

  return jsonb_build_object(
    'market_id', p_market_id,
    'status', 'void',
    'refunds', v_count,
    'total_refunded', v_total
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- settle_market
-- ---------------------------------------------------------------------------
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
  v_market     markets%rowtype;
  v_action     text;
  v_prize      numeric;
  v_pool_win   numeric;
  v_fee        numeric;
  v_bet        record;
  v_payout     numeric;
  v_paid       int := 0;
  v_paid_total numeric := 0;
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

  if p_winning_side = 'YES' then v_pool_win := v_market.pool_yes;
  else v_pool_win := v_market.pool_no;
  end if;

  v_prize := (v_market.pool_yes + v_market.pool_no) * (1 - v_market.house_fee_pct);
  v_fee := (v_market.pool_yes + v_market.pool_no) * v_market.house_fee_pct;

  update public.markets
  set status = 'settled',
      resolved = p_winning_side,
      accept_bets = false,
      resolved_at = now(),
      settled_at = now(),
      updated_at = now()
  where id = p_market_id;

  for v_bet in
    select b.id, b.user_id, b.stake
    from public.bets b
    where b.market_id = p_market_id
      and b.side = p_winning_side
      and b.payout is null
  loop
    v_payout := round((v_bet.stake / v_pool_win) * v_prize, 2);
    update public.bets set payout = v_payout where id = v_bet.id;
    update public.profiles
    set balance = balance + v_payout,
        pnl = pnl + (v_payout - v_bet.stake)
    where id = v_bet.user_id;
    insert into public.transactions (user_id, type, market_id, market_label, amount)
    values (v_bet.user_id, 'payout', p_market_id, v_market.region, v_payout);
    insert into public.notifications (user_id, kind, text, market_id)
    values (
      v_bet.user_id, 'win',
      'Payout de ' || v_payout::text || ' no mercado ' || v_market.region,
      p_market_id
    );
    v_paid := v_paid + 1;
    v_paid_total := v_paid_total + v_payout;
  end loop;

  if p_resolution_id is not null then
    update public.market_resolutions
    set status = 'settled',
        payout_summary = jsonb_build_object(
          'winning_side', p_winning_side,
          'prize_pool', v_prize,
          'house_fee', v_fee,
          'payouts', v_paid,
          'total_paid', v_paid_total
        )
    where id = p_resolution_id;
  else
    insert into public.market_resolutions (
      market_id, status, derived_side, source, payout_summary
    ) values (
      p_market_id, 'settled', p_winning_side, 'manual',
      jsonb_build_object(
        'winning_side', p_winning_side,
        'prize_pool', v_prize,
        'house_fee', v_fee,
        'payouts', v_paid,
        'total_paid', v_paid_total
      )
    );
  end if;

  return jsonb_build_object(
    'market_id', p_market_id,
    'status', 'settled',
    'winning_side', p_winning_side,
    'prize_pool', v_prize,
    'house_fee', v_fee,
    'payouts', v_paid
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Oracle: collect + validate
-- ---------------------------------------------------------------------------
create or replace function public.oracle_raw_metric(
  p_metric text,
  p_flow int,
  p_avg_speed numeric,
  p_congestion numeric
)
returns numeric
language plpgsql
immutable
as $$
begin
  case p_metric
    when 'flow' then return p_flow::numeric;
    when 'avg_speed' then return p_avg_speed;
    when 'congestion' then return p_congestion;
    else return p_flow::numeric;
  end case;
end;
$$;

create or replace function public.oracle_derive_side(
  p_raw numeric,
  p_target numeric,
  p_op text
)
returns bet_side
language plpgsql
immutable
as $$
begin
  case coalesce(p_op, 'gt')
    when 'gt'  then if p_raw >  p_target then return 'YES'; else return 'NO'; end if;
    when 'gte' then if p_raw >= p_target then return 'YES'; else return 'NO'; end if;
    when 'lt'  then if p_raw <  p_target then return 'YES'; else return 'NO'; end if;
    when 'lte' then if p_raw <= p_target then return 'YES'; else return 'NO'; end if;
    else if p_raw > p_target then return 'YES'; else return 'NO'; end if;
  end case;
end;
$$;

create or replace function public.collect_oracle_reading(p_market_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market   markets%rowtype;
  v_region   regions%rowtype;
  v_raw      numeric;
  v_side     bet_side;
  v_conf     numeric;
  v_res_id   uuid;
  v_metric   text;
begin
  select * into v_market from public.markets where id = p_market_id for update;
  if not found then raise exception 'Market not found'; end if;

  if v_market.region_id is null then
    return jsonb_build_object('error', 'missing_region_id');
  end if;

  select * into v_region from public.regions where id = v_market.region_id;
  if not found then
    return jsonb_build_object('error', 'region_not_found');
  end if;

  v_metric := coalesce(
    v_market.resolution_metric,
    case v_market.category
      when 'Fluxo' then 'flow'
      when 'Velocidade' then 'avg_speed'
      when 'Congestionamento' then 'flow'
      when 'Evento' then 'flow'
      else 'flow'
    end
  );

  v_raw := public.oracle_raw_metric(
    v_metric, v_region.flow, v_region.avg_speed, v_region.congestion
  );
  v_side := public.oracle_derive_side(
    v_raw,
    v_market.target,
    coalesce(v_market.comparison_op,
      case v_market.category when 'Velocidade' then 'lt' else 'gt' end
    )
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
    p_market_id,
    'submitted',
    v_raw,
    v_side,
    v_conf,
    'urbanmind-regions-v1',
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
begin
  select * into v_market from public.markets where id = p_market_id;
  select * into v_res from public.market_resolutions where id = p_resolution_id;

  if v_res.raw_value is null then
    v_checks := v_checks || jsonb_build_object('consistency', false);
    v_pass := false;
  else
    v_checks := v_checks || jsonb_build_object('consistency', true);
  end if;

  if v_market.ai_value > 0 then
    v_sanity := abs(v_res.raw_value - v_market.ai_value) / v_market.ai_value;
    v_checks := v_checks || jsonb_build_object(
      'sanity_ratio', v_sanity,
      'sanity', v_sanity <= 0.4
    );
    if v_sanity > 0.4 then v_pass := false; end if;
  else
    v_checks := v_checks || jsonb_build_object('sanity', true);
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

-- ---------------------------------------------------------------------------
-- Process one market through oracle → settle | dispute | void
-- ---------------------------------------------------------------------------
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

  select derived_side into v_side
  from public.market_resolutions where id = v_res_id;

  return public.settle_market(p_market_id, v_side, v_res_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Lifecycle tick (pg_cron)
-- ---------------------------------------------------------------------------
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
  v_result jsonb;
begin
  update public.markets
  set status = 'closing', updated_at = now()
  where status = 'live'
    and accept_bets = true
    and ends_at > now()
    and ends_at <= now() + interval '30 minutes';
  get diagnostics v_closing = row_count;

  update public.markets
  set status = 'closed',
      accept_bets = false,
      updated_at = now()
  where status in ('live', 'closing')
    and ends_at <= now();
  get diagnostics v_closed = row_count;

  for v_row in
    select id from public.markets
    where status = 'closed'
    for update skip locked
  loop
    v_result := public.process_market_resolution(v_row.id);
    v_resolved := v_resolved + 1;
  end loop;

  return jsonb_build_object(
    'closing_promoted', v_closing,
    'closed', v_closed,
    'processed', v_resolved
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin resolve (dispute)
-- ---------------------------------------------------------------------------
create or replace function public.admin_resolve_market(
  p_market_id text,
  p_winning_side bet_side,
  p_note text default null
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
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;

  select is_admin into v_admin from public.profiles where id = v_uid;
  if not coalesce(v_admin, false) then
    raise exception 'Admin only';
  end if;

  select * into v_market from public.markets where id = p_market_id for update;
  if not found then raise exception 'Market not found'; end if;
  if v_market.status not in ('dispute', 'resolving', 'closed') then
    raise exception 'Market not in disputable state: %', v_market.status;
  end if;

  insert into public.market_resolutions (
    market_id, status, derived_side, source, validation
  ) values (
    p_market_id, 'validated', p_winning_side, 'admin',
    jsonb_build_object('note', coalesce(p_note, ''))
  );

  return public.settle_market(p_market_id, p_winning_side);
end;
$$;

-- Legacy wrappers (deprecated — no public execute)
create or replace function public.resolve_market(
  p_market_id text,
  p_winning_side bet_side
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.settle_market(p_market_id, p_winning_side);
end;
$$;

create or replace function public.resolve_expired_markets()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tick jsonb;
begin
  v_tick := public.tick_market_lifecycle();
  return coalesce((v_tick->>'processed')::int, 0);
end;
$$;

-- ---------------------------------------------------------------------------
-- place_bet hardening
-- ---------------------------------------------------------------------------
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

  select * into v_profile from public.profiles where id = v_user_id for update;
  if not found then raise exception 'Profile not found'; end if;
  if p_stake <= 0 then raise exception 'Stake must be positive'; end if;
  if v_profile.balance < p_stake then raise exception 'Insufficient balance'; end if;

  select * into v_market from public.markets where id = p_market_id for update;
  if not found then raise exception 'Market not found'; end if;

  if v_market.frozen then
    raise exception 'Market is frozen';
  end if;

  if v_market.status not in ('live', 'closing') then
    raise exception 'Market not accepting bets (status=%)', v_market.status;
  end if;

  if not v_market.accept_bets then
    raise exception 'Market closed for entries';
  end if;

  if now() >= v_market.ends_at then
    raise exception 'Market entry window ended';
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

-- ---------------------------------------------------------------------------
-- Public RPC: read-only lifecycle refresh (optional client poll)
-- ---------------------------------------------------------------------------
create or replace function public.refresh_market_lifecycle()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.tick_market_lifecycle();
end;
$$;

grant execute on function public.refresh_market_lifecycle() to authenticated;
grant execute on function public.place_bet(text, bet_side, numeric) to authenticated;

revoke execute on function public.resolve_market(text, bet_side) from authenticated;
revoke execute on function public.resolve_expired_markets() from authenticated;
revoke execute on function public.settle_market(text, bet_side, uuid) from public;
revoke execute on function public.refund_market(text, text) from public;
revoke execute on function public.tick_market_lifecycle() from public;
revoke execute on function public.process_market_resolution(text) from public;
revoke execute on function public.collect_oracle_reading(text) from public;
revoke execute on function public.admin_resolve_market(text, bet_side, text) from public;

grant execute on function public.admin_resolve_market(text, bet_side, text) to authenticated;

-- pg_cron (Supabase: enable in dashboard if job fails locally)
create extension if not exists pg_cron with schema extensions;

do $cron$
begin
  if exists (select 1 from cron.job where jobname = 'viax-lifecycle') then
    perform cron.unschedule('viax-lifecycle');
  end if;
  perform cron.schedule(
    'viax-lifecycle',
    '* * * * *',
    $$select public.tick_market_lifecycle()$$
  );
exception
  when others then
    raise notice 'pg_cron schedule skipped: %', sqlerrm;
end;
$cron$;

-- Update public trader bets for settled status (keep original return shape)
drop function if exists public.get_public_trader_bets(uuid);

create function public.get_public_trader_bets(p_user_id uuid)
returns table (
  id uuid,
  side text,
  stake numeric,
  payout numeric,
  market_id text,
  market_question text,
  market_region text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    b.id,
    b.side::text,
    b.stake,
    b.payout,
    b.market_id,
    m.question,
    m.region,
    b.created_at
  from public.bets b
  inner join public.markets m on m.id = b.market_id
  where b.user_id = p_user_id
    and m.status in ('settled', 'resolved')
    and b.payout is not null
    and b.payout > 0
  order by b.created_at desc
  limit 8;
$$;

grant execute on function public.get_public_trader_bets(uuid) to authenticated;

-- Demo admins for dispute resolution UI
update public.profiles set is_admin = true
where handle in ('mc_oracle', 'lucasalpha');
