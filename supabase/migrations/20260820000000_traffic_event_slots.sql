-- Traffic event slots: eternal templates in admin, one live instance at a time (1 min + 15 min gap).

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------
create table if not exists public.traffic_event_templates (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  question              text not null,
  region                text not null,
  region_id             text references public.regions(id) on delete set null,
  target                numeric not null,
  category              public.market_category not null default 'Fluxo',
  resolution_metric     text,
  comparison_op         text check (comparison_op is null or comparison_op in ('gt', 'lt', 'gte', 'lte')),
  data_source           text not null default 'regions',
  camera_id             text references public.cameras(id) on delete set null,
  ai_side               public.bet_side not null default 'YES',
  ai_value              numeric not null default 0,
  ai_confidence         numeric not null default 0.75,
  active                boolean not null default true,
  ready                 boolean not null default false,
  weight                int not null default 1 check (weight >= 1),
  last_tested_at        timestamptz,
  last_used_at          timestamptz,
  last_spawned_market_id text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists traffic_event_templates_ready_idx
  on public.traffic_event_templates (active, ready)
  where active = true and ready = true;

create table if not exists public.traffic_scheduler (
  id                 int primary key default 1 check (id = 1),
  event_duration     interval not null default interval '1 minute',
  gap_after_end      interval not null default interval '15 minutes',
  next_starts_at     timestamptz,
  last_ended_at      timestamptz,
  current_market_id  text references public.markets(id) on delete set null,
  last_template_id   uuid references public.traffic_event_templates(id) on delete set null,
  updated_at         timestamptz not null default now()
);

insert into public.traffic_scheduler (id)
values (1)
on conflict (id) do nothing;

alter table public.markets
  add column if not exists traffic_template_id uuid references public.traffic_event_templates(id) on delete set null,
  add column if not exists is_traffic_slot boolean not null default false;

create unique index if not exists markets_one_live_traffic_slot_idx
  on public.markets ((1))
  where market_kind = 'platform'
    and is_traffic_slot = true
    and status in ('live', 'closing');

create index if not exists markets_traffic_slot_ended_idx
  on public.markets (coalesce(settled_at, updated_at) desc)
  where is_traffic_slot = true
    and status in ('settled', 'void', 'dispute');

alter table public.traffic_event_templates enable row level security;
alter table public.traffic_scheduler enable row level security;

create policy "traffic_templates_admin_all"
  on public.traffic_event_templates for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

create policy "traffic_scheduler_admin_all"
  on public.traffic_scheduler for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- ---------------------------------------------------------------------------
-- Seed templates from legacy *-live markets
-- ---------------------------------------------------------------------------
insert into public.traffic_event_templates (
  name, question, region, region_id, target, category,
  resolution_metric, comparison_op, data_source, active, ready
)
select
  m.id,
  m.question,
  m.region,
  m.region_id,
  m.target,
  m.category,
  m.resolution_metric,
  m.comparison_op,
  coalesce(m.data_source, 'regions'),
  true,
  false
from public.markets m
where m.id like '%-live'
  and coalesce(m.market_kind, 'platform') = 'platform'
  and not exists (
    select 1 from public.traffic_event_templates t where t.name = m.id
  );

-- Retire parallel demo live markets
update public.markets
set
  archived = true,
  accept_bets = false,
  status = case when status in ('settled', 'void') then status else 'settled'::public.market_status end,
  updated_at = now()
where id like '%-live'
  and coalesce(market_kind, 'platform') = 'platform'
  and coalesce(is_traffic_slot, false) = false;

-- ---------------------------------------------------------------------------
-- pick_traffic_template_random
-- ---------------------------------------------------------------------------
create or replace function public.pick_traffic_template_random(p_exclude_id uuid default null)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select t.id
  from public.traffic_event_templates t
  where t.active = true
    and t.ready = true
    and (p_exclude_id is null or t.id <> p_exclude_id)
  order by random()
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- spawn_traffic_slot_from_template
-- ---------------------------------------------------------------------------
create or replace function public.spawn_traffic_slot_from_template()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sch      public.traffic_scheduler%rowtype;
  v_tpl_id   uuid;
  v_tpl      public.traffic_event_templates%rowtype;
  v_market_id text;
  v_snaps    int;
begin
  select * into v_sch from public.traffic_scheduler where id = 1 for update;
  if not found then
    insert into public.traffic_scheduler (id) values (1);
    select * into v_sch from public.traffic_scheduler where id = 1;
  end if;

  if exists (
    select 1 from public.markets
    where is_traffic_slot = true and status in ('live', 'closing')
  ) then
    return jsonb_build_object('ok', false, 'reason', 'slot_already_live');
  end if;

  v_tpl_id := public.pick_traffic_template_random(v_sch.last_template_id);
  if v_tpl_id is null then
    return jsonb_build_object('ok', false, 'reason', 'no_ready_templates');
  end if;

  select * into v_tpl from public.traffic_event_templates where id = v_tpl_id;
  v_market_id := 'traffic-' || replace(gen_random_uuid()::text, '-', '');

  insert into public.markets (
    id, question, region, target, category, ends_at,
    status, accept_bets, pool_yes, pool_no, participants, trend,
    ai_side, ai_value, ai_confidence,
    data_source, resolution_metric, comparison_op, region_id,
    market_kind, starts_at, is_traffic_slot, traffic_template_id
  ) values (
    v_market_id,
    v_tpl.question,
    v_tpl.region,
    v_tpl.target,
    v_tpl.category,
    now() + v_sch.event_duration,
    'live',
    true,
    0, 0, 0, 0,
    v_tpl.ai_side,
    v_tpl.ai_value,
    v_tpl.ai_confidence,
    v_tpl.data_source,
    v_tpl.resolution_metric,
    v_tpl.comparison_op,
    v_tpl.region_id,
    'platform',
    now(),
    true,
    v_tpl.id
  );

  v_snaps := public.seed_oracle_snapshots_for_market(v_market_id, 3);

  update public.traffic_event_templates
  set last_used_at = now(), last_spawned_market_id = v_market_id, updated_at = now()
  where id = v_tpl.id;

  update public.traffic_scheduler
  set
    current_market_id = v_market_id,
    last_template_id = v_tpl.id,
    next_starts_at = null,
    updated_at = now()
  where id = 1;

  return jsonb_build_object(
    'ok', true,
    'market_id', v_market_id,
    'template_id', v_tpl.id,
    'snapshots_seeded', v_snaps
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- tick_traffic_slots
-- ---------------------------------------------------------------------------
create or replace function public.tick_traffic_slots()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sch     public.traffic_scheduler%rowtype;
  v_cur     public.markets%rowtype;
  v_spawned jsonb;
begin
  select * into v_sch from public.traffic_scheduler where id = 1 for update;

  if v_sch.current_market_id is not null then
    select * into v_cur from public.markets where id = v_sch.current_market_id;
    if found and v_cur.status in ('settled', 'void', 'dispute') then
      update public.traffic_scheduler
      set
        current_market_id = null,
        last_ended_at = coalesce(v_cur.settled_at, v_cur.updated_at, now()),
        next_starts_at = coalesce(v_cur.settled_at, v_cur.updated_at, now()) + v_sch.gap_after_end,
        last_template_id = coalesce(v_cur.traffic_template_id, v_sch.last_template_id),
        updated_at = now()
      where id = 1;
      select * into v_sch from public.traffic_scheduler where id = 1;
    elsif found and v_cur.status in ('closed', 'resolving') then
      return jsonb_build_object('ok', true, 'waiting_resolution', v_sch.current_market_id);
    elsif not found then
      update public.traffic_scheduler
      set current_market_id = null, updated_at = now()
      where id = 1;
      select * into v_sch from public.traffic_scheduler where id = 1;
    end if;
  end if;

  if v_sch.current_market_id is null
     and (v_sch.next_starts_at is null or now() >= v_sch.next_starts_at) then
    v_spawned := public.spawn_traffic_slot_from_template();
    return jsonb_build_object('ok', true, 'spawn', v_spawned);
  end if;

  return jsonb_build_object(
    'ok', true,
    'current_market_id', v_sch.current_market_id,
    'next_starts_at', v_sch.next_starts_at
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- get_traffic_public_state
-- ---------------------------------------------------------------------------
create or replace function public.get_traffic_public_state()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_sch public.traffic_scheduler%rowtype;
  v_active jsonb;
  v_recent jsonb;
begin
  select * into v_sch from public.traffic_scheduler where id = 1;

  select to_jsonb(m.*) into v_active
  from public.markets m
  where m.is_traffic_slot = true
    and m.status in ('live', 'closing')
  order by m.starts_at desc nulls last
  limit 1;

  if v_active is null and v_sch.current_market_id is not null then
    select to_jsonb(m.*) into v_active
    from public.markets m
    where m.id = v_sch.current_market_id;
  end if;

  select coalesce(jsonb_agg(row_data order by sort_at desc), '[]'::jsonb) into v_recent
  from (
    select
      jsonb_build_object(
        'id', m.id,
        'question', m.question,
        'region', m.region,
        'status', m.status,
        'target', m.target,
        'category', m.category,
        'resolution_metric', m.resolution_metric,
        'comparison_op', m.comparison_op,
        'resolved', m.resolved,
        'pool_yes', m.pool_yes,
        'pool_no', m.pool_no,
        'participants', m.participants,
        'starts_at', m.starts_at,
        'ends_at', m.ends_at,
        'settled_at', m.settled_at,
        'raw_value', r.raw_value,
        'derived_side', r.derived_side,
        'confidence', r.confidence
      ) as row_data,
      coalesce(m.settled_at, m.updated_at) as sort_at
    from public.markets m
    left join lateral (
      select mr.raw_value, mr.derived_side, mr.confidence
      from public.market_resolutions mr
      where mr.market_id = m.id
      order by mr.created_at desc
      limit 1
    ) r on true
    where m.is_traffic_slot = true
      and m.status in ('settled', 'void', 'dispute')
    order by coalesce(m.settled_at, m.updated_at) desc
    limit 5
  ) sub;

  return jsonb_build_object(
    'scheduler', jsonb_build_object(
      'next_starts_at', v_sch.next_starts_at,
      'last_ended_at', v_sch.last_ended_at,
      'event_duration_seconds', extract(epoch from v_sch.event_duration),
      'gap_after_end_seconds', extract(epoch from v_sch.gap_after_end)
    ),
    'active_market', v_active,
    'recent_ended', v_recent
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- list_traffic_ended_markets
-- ---------------------------------------------------------------------------
create or replace function public.list_traffic_ended_markets(p_limit int default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  select coalesce(jsonb_agg(row_data order by sort_at desc), '[]'::jsonb) into v_result
  from (
    select
      jsonb_build_object(
        'id', m.id,
        'question', m.question,
        'region', m.region,
        'status', m.status,
        'target', m.target,
        'category', m.category,
        'resolution_metric', m.resolution_metric,
        'comparison_op', m.comparison_op,
        'resolved', m.resolved,
        'pool_yes', m.pool_yes,
        'pool_no', m.pool_no,
        'participants', m.participants,
        'starts_at', m.starts_at,
        'ends_at', m.ends_at,
        'settled_at', m.settled_at,
        'raw_value', r.raw_value,
        'derived_side', r.derived_side,
        'confidence', r.confidence
      ) as row_data,
      coalesce(m.settled_at, m.updated_at) as sort_at
    from public.markets m
    left join lateral (
      select mr.raw_value, mr.derived_side, mr.confidence
      from public.market_resolutions mr
      where mr.market_id = m.id
      order by mr.created_at desc
      limit 1
    ) r on true
    where m.is_traffic_slot = true
      and m.status in ('settled', 'void', 'dispute')
    order by coalesce(m.settled_at, m.updated_at) desc
    limit greatest(1, least(p_limit, 100))
  ) sub;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin RPCs
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_traffic_templates()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();
  return coalesce(
    (
      select jsonb_agg(to_jsonb(t) order by t.updated_at desc)
      from public.traffic_event_templates t
    ),
    '[]'::jsonb
  );
end;
$$;

create or replace function public.admin_upsert_traffic_template(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_metric text;
  v_op text;
  v_cat public.market_category;
begin
  perform public.assert_admin();

  v_id := nullif(p_payload->>'id', '')::uuid;
  v_cat := coalesce((p_payload->>'category')::public.market_category, 'Fluxo'::public.market_category);
  v_metric := coalesce(
    nullif(p_payload->>'resolution_metric', ''),
    case v_cat when 'Velocidade' then 'avg_speed' else 'flow' end
  );
  v_op := coalesce(
    nullif(p_payload->>'comparison_op', ''),
    case v_cat when 'Velocidade' then 'lt' else 'gt' end
  );

  if v_id is null then
    insert into public.traffic_event_templates (
      name, question, region, region_id, target, category,
      resolution_metric, comparison_op, data_source, camera_id,
      ai_side, ai_value, ai_confidence, active, ready, weight
    ) values (
      coalesce(nullif(p_payload->>'name', ''), left(p_payload->>'question', 80)),
      p_payload->>'question',
      p_payload->>'region',
      nullif(p_payload->>'region_id', ''),
      (p_payload->>'target')::numeric,
      v_cat,
      v_metric,
      v_op,
      coalesce(nullif(p_payload->>'data_source', ''), 'regions'),
      nullif(p_payload->>'camera_id', ''),
      coalesce((p_payload->>'ai_side')::public.bet_side, 'YES'::public.bet_side),
      coalesce((p_payload->>'ai_value')::numeric, 0),
      coalesce((p_payload->>'ai_confidence')::numeric, 0.75),
      coalesce((p_payload->>'active')::boolean, true),
      coalesce((p_payload->>'ready')::boolean, false),
      coalesce((p_payload->>'weight')::int, 1)
    )
    returning id into v_id;
  else
    update public.traffic_event_templates set
      name = coalesce(nullif(p_payload->>'name', ''), name),
      question = coalesce(nullif(p_payload->>'question', ''), question),
      region = coalesce(nullif(p_payload->>'region', ''), region),
      region_id = case when p_payload ? 'region_id' then nullif(p_payload->>'region_id', '') else region_id end,
      target = coalesce((p_payload->>'target')::numeric, target),
      category = coalesce((p_payload->>'category')::public.market_category, category),
      resolution_metric = v_metric,
      comparison_op = v_op,
      data_source = coalesce(nullif(p_payload->>'data_source', ''), data_source),
      camera_id = case when p_payload ? 'camera_id' then nullif(p_payload->>'camera_id', '') else camera_id end,
      ai_side = coalesce((p_payload->>'ai_side')::public.bet_side, ai_side),
      ai_value = coalesce((p_payload->>'ai_value')::numeric, ai_value),
      ai_confidence = coalesce((p_payload->>'ai_confidence')::numeric, ai_confidence),
      active = coalesce((p_payload->>'active')::boolean, active),
      ready = coalesce((p_payload->>'ready')::boolean, ready),
      weight = coalesce((p_payload->>'weight')::int, weight),
      updated_at = now()
    where id = v_id;
  end if;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

create or replace function public.admin_test_traffic_template(p_template_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tpl public.traffic_event_templates%rowtype;
  v_cameras jsonb;
begin
  perform public.assert_admin();
  select * into v_tpl from public.traffic_event_templates where id = p_template_id;
  if not found then raise exception 'Template not found'; end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'region_id', c.region_id,
      'status', c.status,
      'stream_url', c.stream_url,
      'detection_ok', c.detection_ok
    )
  ), '[]'::jsonb) into v_cameras
  from public.cameras c
  where c.status = 'online'
    and (
      (v_tpl.camera_id is not null and c.id = v_tpl.camera_id)
      or (v_tpl.camera_id is null and v_tpl.region_id is not null and c.region_id = v_tpl.region_id)
    );

  return jsonb_build_object(
    'template_id', v_tpl.id,
    'region_id', v_tpl.region_id,
    'camera_id', v_tpl.camera_id,
    'cameras', v_cameras
  );
end;
$$;

create or replace function public.admin_set_traffic_template_ready(p_template_id uuid, p_ready boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();
  update public.traffic_event_templates
  set
    ready = p_ready,
    last_tested_at = case when p_ready then now() else last_tested_at end,
    updated_at = now()
  where id = p_template_id;
  if not found then raise exception 'Template not found'; end if;
  return jsonb_build_object('ok', true, 'ready', p_ready);
end;
$$;

create or replace function public.admin_update_traffic_scheduler(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_duration interval;
  v_gap interval;
begin
  perform public.assert_admin();

  if p_payload ? 'event_duration_seconds' then
    v_duration := make_interval(secs => greatest(30, (p_payload->>'event_duration_seconds')::int));
  end if;
  if p_payload ? 'gap_after_end_seconds' then
    v_gap := make_interval(secs => greatest(60, (p_payload->>'gap_after_end_seconds')::int));
  end if;

  update public.traffic_scheduler set
    event_duration = coalesce(v_duration, event_duration),
    gap_after_end = coalesce(v_gap, gap_after_end),
    next_starts_at = case
      when p_payload ? 'next_starts_at' then (p_payload->>'next_starts_at')::timestamptz
      else next_starts_at
    end,
    updated_at = now()
  where id = 1;

  return (select to_jsonb(s) from public.traffic_scheduler s where s.id = 1);
end;
$$;

-- ---------------------------------------------------------------------------
-- Lifecycle: skip 30-min closing for traffic slots
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
begin
  v_snaps := public.ingest_oracle_snapshots();

  update public.markets
  set status = 'closing', updated_at = now()
  where status = 'live' and accept_bets = true
    and coalesce(is_traffic_slot, false) = false
    and ends_at > now()
    and ends_at <= now() + interval '30 minutes';
  get diagnostics v_closing = row_count;

  update public.markets
  set status = 'closed', accept_bets = false, updated_at = now()
  where status in ('live', 'closing') and ends_at <= now();
  get diagnostics v_closed = row_count;

  for v_row in
    select id from public.markets
    where status = 'closed'
      and coalesce(market_kind, 'platform') = 'platform'
    for update skip locked
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

-- ---------------------------------------------------------------------------
-- Disable demo parallel refresh
-- ---------------------------------------------------------------------------
create or replace function public.refresh_demo_live_markets()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object('ok', true, 'deprecated', true, 'message', 'Use tick_traffic_slots');
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant execute on function public.get_traffic_public_state() to anon, authenticated;
grant execute on function public.list_traffic_ended_markets(int) to anon, authenticated;
grant execute on function public.admin_list_traffic_templates() to authenticated;
grant execute on function public.admin_upsert_traffic_template(jsonb) to authenticated;
grant execute on function public.admin_test_traffic_template(uuid) to authenticated;
grant execute on function public.admin_set_traffic_template_ready(uuid, boolean) to authenticated;
grant execute on function public.admin_update_traffic_scheduler(jsonb) to authenticated;

revoke execute on function public.tick_traffic_slots() from public, anon, authenticated;
revoke execute on function public.spawn_traffic_slot_from_template() from public, anon, authenticated;
revoke execute on function public.pick_traffic_template_random(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- pg_cron: traffic slots after lifecycle (same minute, chained via SQL)
-- ---------------------------------------------------------------------------
do $cron$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'viax-traffic-slots') then
      perform cron.unschedule('viax-traffic-slots');
    end if;
    perform cron.schedule(
      'viax-traffic-slots',
      '* * * * *',
      $job$select public.tick_traffic_slots()$job$
    );
  end if;
end;
$cron$;
