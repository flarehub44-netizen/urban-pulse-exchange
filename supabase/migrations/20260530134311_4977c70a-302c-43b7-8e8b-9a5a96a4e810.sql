-- =====================================================================
-- 1) RETENTION — market_history (90d) and camera_metrics (30d)
-- =====================================================================

-- Indexes that make the prune predicate index-only
create index if not exists market_history_recorded_at_idx
  on public.market_history (recorded_at);

create index if not exists camera_metrics_recorded_at_idx
  on public.camera_metrics (recorded_at);

-- Retention helpers (SECURITY DEFINER, callable only by cron / service role)
create or replace function public.prune_market_history(p_days int default 90)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_deleted int := 0;
begin
  delete from public.market_history
   where recorded_at < now() - make_interval(days => greatest(p_days, 1));
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

create or replace function public.prune_camera_metrics(p_days int default 30)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_deleted int := 0;
begin
  delete from public.camera_metrics
   where recorded_at < now() - make_interval(days => greatest(p_days, 1));
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke execute on function public.prune_market_history(int) from public, anon, authenticated;
revoke execute on function public.prune_camera_metrics(int) from public, anon, authenticated;

-- pg_cron schedules (idempotent reschedule)
do $cron$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'viax-prune-market-history') then
      perform cron.unschedule('viax-prune-market-history');
    end if;
    perform cron.schedule(
      'viax-prune-market-history',
      '10 3 * * *',
      $job$select public.prune_market_history(90)$job$
    );

    if exists (select 1 from cron.job where jobname = 'viax-prune-camera-metrics') then
      perform cron.unschedule('viax-prune-camera-metrics');
    end if;
    perform cron.schedule(
      'viax-prune-camera-metrics',
      '20 3 * * *',
      $job$select public.prune_camera_metrics(30)$job$
    );
  end if;
end;
$cron$;

-- =====================================================================
-- 2) Vision worker — per-camera lock + debounce in ingest_camera_metrics
-- =====================================================================
create or replace function public.ingest_camera_metrics(
  p_camera_id text,
  p_vehicle_count integer,
  p_confidence numeric default 0.75,
  p_avg_speed_estimate numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cam   public.cameras%rowtype;
  v_flow  int;
  v_conf  numeric;
  v_debounce_seconds constant int := 15;
  v_last  timestamptz;
begin
  if p_vehicle_count < 0 then
    raise exception 'vehicle_count must be >= 0';
  end if;

  -- Serialize concurrent ingests for the SAME camera within this tx.
  -- Different cameras hash to different keys, so unrelated cameras are not blocked.
  if not pg_try_advisory_xact_lock(hashtext('viax:cam:' || p_camera_id)) then
    return jsonb_build_object('ok', true, 'skipped', 'locked', 'camera_id', p_camera_id);
  end if;

  select * into v_cam from public.cameras where id = p_camera_id;
  if not found then
    raise exception 'Camera not found';
  end if;
  if v_cam.region_id is null then
    raise exception 'Camera has no region_id';
  end if;

  -- Debounce: if another worker just ingested for this camera, skip.
  select max(recorded_at) into v_last
    from public.camera_metrics
   where camera_id = p_camera_id
     and recorded_at > now() - make_interval(secs => v_debounce_seconds);
  if v_last is not null then
    return jsonb_build_object(
      'ok', true, 'skipped', 'debounced',
      'camera_id', p_camera_id, 'last_at', v_last
    );
  end if;

  v_conf := least(1, greatest(0, coalesce(p_confidence, 0.75)));
  v_flow := greatest(0, p_vehicle_count * 45);

  insert into public.camera_metrics (
    camera_id, region_id, vehicle_count, flow_estimate, avg_speed_estimate, confidence
  ) values (
    v_cam.id, v_cam.region_id, p_vehicle_count, v_flow, p_avg_speed_estimate, v_conf
  );

  update public.cameras set
    detection_ok = true,
    fps = coalesce(fps, 5),
    updated_at = now()
  where id = v_cam.id;

  update public.regions set
    flow = v_flow,
    avg_speed = coalesce(p_avg_speed_estimate, avg_speed),
    congestion = least(0.99, greatest(0.05, 1 - (coalesce(p_avg_speed_estimate, avg_speed) / 60.0))),
    updated_at = now()
  where id = v_cam.region_id;

  return jsonb_build_object(
    'ok', true,
    'camera_id', v_cam.id,
    'region_id', v_cam.region_id,
    'flow_estimate', v_flow
  );
end;
$$;

-- =====================================================================
-- 3) Remaining admin-EXISTS policies → use is_current_user_admin()
-- =====================================================================
drop policy if exists traffic_templates_admin_all on public.traffic_event_templates;
create policy traffic_templates_admin_all on public.traffic_event_templates
  for all to authenticated
  using (public.is_current_user_admin())
  with check (public.is_current_user_admin());

drop policy if exists traffic_scheduler_admin_all on public.traffic_scheduler;
create policy traffic_scheduler_admin_all on public.traffic_scheduler
  for all to authenticated
  using (public.is_current_user_admin())
  with check (public.is_current_user_admin());