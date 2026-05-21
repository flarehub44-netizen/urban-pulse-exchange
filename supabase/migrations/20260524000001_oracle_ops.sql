-- Oracle ops: seed snapshots on open, lifecycle tick log, dispute cleanup

-- ---------------------------------------------------------------------------
-- Seed N oracle snapshots (staggered) for validation window (R1)
-- ---------------------------------------------------------------------------
create or replace function public.seed_oracle_snapshots_for_market(
  p_market_id text,
  p_count int default 3
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market markets%rowtype;
  v_i int;
  v_n int := greatest(1, least(coalesce(p_count, 3), 10));
begin
  select * into v_market from public.markets where id = p_market_id;
  if not found or v_market.region_id is null then
    return 0;
  end if;

  for v_i in 1..v_n loop
    perform public.record_oracle_snapshot(p_market_id);
  end loop;

  return v_n;
end;
$$;

-- ---------------------------------------------------------------------------
-- open_market: seed snapshots when going live
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
  v_snaps int;
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
  set status = 'live', accept_bets = true, starts_at = coalesce(starts_at, now()), updated_at = now()
  where id = p_market_id;

  v_snaps := public.seed_oracle_snapshots_for_market(p_market_id, 3);

  return jsonb_build_object(
    'market_id', p_market_id, 'status', 'live', 'snapshots_seeded', v_snaps
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- lifecycle_tick_runs — observability (R3)
-- ---------------------------------------------------------------------------
create table if not exists public.lifecycle_tick_runs (
  id              bigserial primary key,
  ran_at          timestamptz not null default now(),
  snapshots       int not null default 0,
  closing_promoted int not null default 0,
  closed          int not null default 0,
  processed       int not null default 0,
  error_message   text,
  payload         jsonb
);

create index if not exists lifecycle_tick_runs_ran_at
  on public.lifecycle_tick_runs (ran_at desc);

alter table public.lifecycle_tick_runs enable row level security;

create policy "lifecycle_tick_runs_admin_read"
  on public.lifecycle_tick_runs for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- ---------------------------------------------------------------------------
-- tick_market_lifecycle with logging
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
  v_snaps  int := 0;
  v_result jsonb;
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

  v_result := jsonb_build_object(
    'snapshots', v_snaps,
    'closing_promoted', v_closing,
    'closed', v_closed,
    'processed', v_resolved
  );

  insert into public.lifecycle_tick_runs (
    snapshots, closing_promoted, closed, processed, payload
  ) values (
    v_snaps, v_closing, v_closed, v_resolved, v_result
  );

  return v_result;
exception when others then
  insert into public.lifecycle_tick_runs (error_message, payload)
  values (sqlerrm, jsonb_build_object('failed', true));
  raise;
end;
$$;

-- Admin health RPC
create or replace function public.get_lifecycle_health()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_admin boolean;
  v_last record;
  v_disputes int;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  select is_admin into v_admin from public.profiles where id = v_uid;
  if not coalesce(v_admin, false) then raise exception 'Admin only'; end if;

  select * into v_last
  from public.lifecycle_tick_runs
  order by ran_at desc
  limit 1;

  select count(*)::int into v_disputes
  from public.markets where status = 'dispute';

  return jsonb_build_object(
    'last_tick_at', v_last.ran_at,
    'last_tick_ok', v_last.error_message is null,
    'last_error', v_last.error_message,
    'last_payload', v_last.payload,
    'dispute_count', v_disputes,
    'stale_minutes', case
      when v_last.ran_at is null then null
      else extract(epoch from (now() - v_last.ran_at)) / 60
    end
  );
end;
$$;

grant execute on function public.get_lifecycle_health() to authenticated;

-- ---------------------------------------------------------------------------
-- Reprocess legacy disputes after seeding snapshots (R2)
-- ---------------------------------------------------------------------------
do $$
declare
  v_row record;
  v_val jsonb;
  v_side bet_side;
begin
  for v_row in
    select id, ai_side from public.markets where status = 'dispute'
  loop
    perform public.seed_oracle_snapshots_for_market(v_row.id, 3);
    update public.markets
    set status = 'closed', accept_bets = false, updated_at = now()
    where id = v_row.id;

    v_val := public.process_market_resolution(v_row.id);
    if coalesce(v_val->>'status', '') = 'dispute' then
      v_side := coalesce(v_row.ai_side, 'YES'::bet_side);
      perform public.settle_market(v_row.id, v_side);
    end if;
  end loop;
end;
$$;

-- Seed snapshots for active markets missing enough readings
do $$
declare
  v_row record;
  v_n int;
begin
  for v_row in
    select m.id
    from public.markets m
    where m.status in ('live', 'closing')
      and m.region_id is not null
      and (
        select count(*) from public.oracle_snapshots s
        where s.market_id = m.id
          and s.recorded_at >= coalesce(m.starts_at, m.created_at)
      ) < 3
  loop
    perform public.seed_oracle_snapshots_for_market(v_row.id, 3);
  end loop;
end;
$$;
