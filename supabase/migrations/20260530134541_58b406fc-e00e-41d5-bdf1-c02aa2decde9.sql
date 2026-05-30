-- =====================================================================
-- Helper: ensure a monthly partition exists for a given parent + month
-- =====================================================================
create or replace function public.ensure_monthly_partition(
  p_parent regclass,
  p_month  date
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_name text := split_part(p_parent::text, '.', 2);
  v_parent_only text := coalesce(nullif(v_parent_name, ''), p_parent::text);
  v_start date := date_trunc('month', p_month)::date;
  v_end   date := (date_trunc('month', p_month) + interval '1 month')::date;
  v_child text := format('%s_y%sm%s', v_parent_only, to_char(v_start,'YYYY'), to_char(v_start,'MM'));
begin
  if not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = v_child
  ) then
    execute format(
      'create table public.%I partition of %s for values from (%L) to (%L)',
      v_child, p_parent::text, v_start, v_end
    );
  end if;
end;
$$;
revoke execute on function public.ensure_monthly_partition(regclass, date) from public, anon, authenticated;

-- =====================================================================
-- 1) market_history → partitioned by recorded_at (monthly)
-- =====================================================================
create table public.market_history_new (
  id bigint not null default nextval('public.market_history_id_seq'::regclass),
  market_id text not null,
  p numeric not null,
  recorded_at timestamptz not null default now(),
  primary key (id, recorded_at)
) partition by range (recorded_at);

-- Default partition catches anything outside the seeded range
create table public.market_history_default partition of public.market_history_new default;

-- Seed monthly partitions 2025-01 .. 2027-12
do $$
declare m date;
begin
  for m in select generate_series(date '2025-01-01', date '2027-12-01', interval '1 month')::date loop
    perform public.ensure_monthly_partition('public.market_history_new'::regclass, m);
  end loop;
end $$;

insert into public.market_history_new (id, market_id, p, recorded_at)
  select id, market_id, p, recorded_at from public.market_history;

alter sequence public.market_history_id_seq owned by none;
drop table public.market_history cascade;
alter table public.market_history_new rename to market_history;
alter sequence public.market_history_id_seq owned by public.market_history.id;
select setval('public.market_history_id_seq',
              greatest(coalesce((select max(id) from public.market_history), 0), 1));

create index market_history_market_id_recorded_at_idx
  on public.market_history (market_id, recorded_at);
create index market_history_recorded_at_idx
  on public.market_history (recorded_at);

grant select on public.market_history to anon, authenticated;
grant all on public.market_history to service_role;

alter table public.market_history enable row level security;
create policy market_history_read_all  on public.market_history for select to authenticated using (true);
create policy market_history_read_anon on public.market_history for select to anon          using (true);

-- =====================================================================
-- 2) camera_metrics → partitioned by recorded_at (monthly)
-- =====================================================================
create table public.camera_metrics_new (
  id bigint not null default nextval('public.camera_metrics_id_seq'::regclass),
  camera_id text not null,
  region_id text not null,
  vehicle_count integer not null default 0,
  flow_estimate integer not null default 0,
  avg_speed_estimate numeric,
  confidence numeric not null default 0,
  recorded_at timestamptz not null default now(),
  primary key (id, recorded_at)
) partition by range (recorded_at);

create table public.camera_metrics_default partition of public.camera_metrics_new default;

do $$
declare m date;
begin
  for m in select generate_series(date '2025-01-01', date '2027-12-01', interval '1 month')::date loop
    perform public.ensure_monthly_partition('public.camera_metrics_new'::regclass, m);
  end loop;
end $$;

insert into public.camera_metrics_new (
  id, camera_id, region_id, vehicle_count, flow_estimate, avg_speed_estimate, confidence, recorded_at
)
  select id, camera_id, region_id, vehicle_count, flow_estimate, avg_speed_estimate, confidence, recorded_at
    from public.camera_metrics;

alter sequence public.camera_metrics_id_seq owned by none;
drop table public.camera_metrics cascade;
alter table public.camera_metrics_new rename to camera_metrics;
alter sequence public.camera_metrics_id_seq owned by public.camera_metrics.id;
select setval('public.camera_metrics_id_seq',
              greatest(coalesce((select max(id) from public.camera_metrics), 0), 1));

create index camera_metrics_region_time on public.camera_metrics (region_id, recorded_at);
create index camera_metrics_camera_time on public.camera_metrics (camera_id, recorded_at);
create index camera_metrics_recorded_at_idx on public.camera_metrics (recorded_at);

grant all on public.camera_metrics to service_role;

alter table public.camera_metrics enable row level security;
create policy camera_metrics_deny_all on public.camera_metrics
  for all to authenticated using (false) with check (false);

-- =====================================================================
-- 3) Monthly cron: ensure next 3 months of partitions exist
-- =====================================================================
create or replace function public.ensure_future_partitions()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare i int;
begin
  for i in 0..3 loop
    perform public.ensure_monthly_partition(
      'public.market_history'::regclass,
      (date_trunc('month', now()) + (i || ' month')::interval)::date
    );
    perform public.ensure_monthly_partition(
      'public.camera_metrics'::regclass,
      (date_trunc('month', now()) + (i || ' month')::interval)::date
    );
  end loop;
end;
$$;
revoke execute on function public.ensure_future_partitions() from public, anon, authenticated;

do $cron$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'viax-ensure-future-partitions') then
      perform cron.unschedule('viax-ensure-future-partitions');
    end if;
    perform cron.schedule(
      'viax-ensure-future-partitions',
      '0 2 1 * *',
      $job$select public.ensure_future_partitions()$job$
    );
  end if;
end;
$cron$;