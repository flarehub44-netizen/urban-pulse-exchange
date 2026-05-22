-- Camera pipeline: metrics ingest, public listing, oracle branch, stream URL validation

-- ---------------------------------------------------------------------------
-- camera_metrics
-- ---------------------------------------------------------------------------
create table if not exists public.camera_metrics (
  id                  bigserial primary key,
  camera_id           text not null references public.cameras(id) on delete cascade,
  region_id           text not null references public.regions(id) on delete cascade,
  vehicle_count       int not null default 0 check (vehicle_count >= 0),
  flow_estimate       int not null default 0,
  avg_speed_estimate  numeric,
  confidence          numeric not null default 0 check (confidence between 0 and 1),
  recorded_at         timestamptz not null default now()
);

create index if not exists camera_metrics_region_time
  on public.camera_metrics(region_id, recorded_at desc);

create index if not exists camera_metrics_camera_time
  on public.camera_metrics(camera_id, recorded_at desc);

alter table public.camera_metrics enable row level security;
create policy "camera_metrics_deny_all"
  on public.camera_metrics for all to authenticated using (false);

-- ---------------------------------------------------------------------------
-- platform_settings defaults
-- ---------------------------------------------------------------------------
insert into public.platform_settings (key, value)
values
  ('camera_oracle_enabled', 'false'::jsonb),
  ('regions_simulator_enabled', 'true'::jsonb)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Stream URL validation
-- ---------------------------------------------------------------------------
create or replace function public.is_allowed_stream_url(p_url text)
returns boolean
language plpgsql
immutable
as $$
declare
  v text := lower(trim(coalesce(p_url, '')));
begin
  if p_url is null or v = '' then
    return true;
  end if;
  if v like 'rtsp://%' or v like 'rtmp://%' then
    return false;
  end if;
  if v like 'http://%' or v like 'https://%' then
    if v like '%.m3u8%' or v like '%mpegurl%' then
      return true;
    end if;
    if v ~ '\.(jpg|jpeg|png|webp|gif)(\?|$)' or v like '%snapshot%' or v like '%frame%' or v like '%shot%' then
      return true;
    end if;
    if v like '%youtube.com%' or v like '%youtu.be%' then
      return true;
    end if;
    return false;
  end if;
  return false;
end;
$$;

-- ---------------------------------------------------------------------------
-- ingest_camera_metrics (vision worker — service_role)
-- ---------------------------------------------------------------------------
create or replace function public.ingest_camera_metrics(
  p_camera_id text,
  p_vehicle_count int,
  p_confidence numeric default 0.75,
  p_avg_speed_estimate numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cam public.cameras%rowtype;
  v_flow int;
  v_conf numeric;
begin
  if p_vehicle_count < 0 then
    raise exception 'vehicle_count must be >= 0';
  end if;

  select * into v_cam from public.cameras where id = p_camera_id;
  if not found then
    raise exception 'Camera not found';
  end if;
  if v_cam.region_id is null then
    raise exception 'Camera has no region_id';
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

revoke all on function public.ingest_camera_metrics(text, int, numeric, numeric) from public;
grant execute on function public.ingest_camera_metrics(text, int, numeric, numeric) to service_role;

-- ---------------------------------------------------------------------------
-- list_live_cameras (public playback)
-- ---------------------------------------------------------------------------
create or replace function public.list_live_cameras(p_region_id text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_result jsonb;
begin
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'region_id', c.region_id,
      'location', c.location,
      'stream_url', c.stream_url,
      'detection_ok', c.detection_ok
    ) order by c.name
  ), '[]'::jsonb) into v_result
  from public.cameras c
  where c.status = 'online'
    and c.stream_url is not null
    and public.is_allowed_stream_url(c.stream_url)
    and (p_region_id is null or c.region_id = p_region_id);

  return v_result;
end;
$$;

grant execute on function public.list_live_cameras(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- get_region_camera_status
-- ---------------------------------------------------------------------------
create or replace function public.get_region_camera_status(p_region_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_online int;
  v_detecting int;
  v_last timestamptz;
  v_last_flow int;
begin
  select count(*) into v_online
  from public.cameras c
  where c.region_id = p_region_id and c.status = 'online';

  select count(*) into v_detecting
  from public.cameras c
  where c.region_id = p_region_id and c.status = 'online' and c.detection_ok;

  select max(cm.recorded_at), (
    select cm2.flow_estimate
    from public.camera_metrics cm2
    join public.cameras c2 on c2.id = cm2.camera_id
    where c2.region_id = p_region_id
    order by cm2.recorded_at desc
    limit 1
  )
  into v_last, v_last_flow
  from public.camera_metrics cm
  join public.cameras c3 on c3.id = cm.camera_id
  where c3.region_id = p_region_id;

  return jsonb_build_object(
    'region_id', p_region_id,
    'online_count', coalesce(v_online, 0),
    'detecting_count', coalesce(v_detecting, 0),
    'last_reading_at', v_last,
    'last_flow_estimate', v_last_flow
  );
end;
$$;

grant execute on function public.get_region_camera_status(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- admin_list_cameras — include last metric
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
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', c.id,
      'region_id', c.region_id,
      'name', c.name,
      'location', c.location,
      'status', c.status,
      'stream_url', c.stream_url,
      'fps', c.fps,
      'detection_ok', c.detection_ok,
      'count_line', c.count_line,
      'updated_at', c.updated_at,
      'last_vehicle_count', lm.vehicle_count,
      'last_flow_estimate', lm.flow_estimate,
      'last_metric_at', lm.recorded_at
    ) order by c.name
  ), '[]'::jsonb) into v_result
  from public.cameras c
  left join lateral (
    select vehicle_count, flow_estimate, recorded_at
    from public.camera_metrics
    where camera_id = c.id
    order by recorded_at desc
    limit 1
  ) lm on true;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- admin_upsert_camera — validate stream URL
-- ---------------------------------------------------------------------------
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

  if p_stream_url is not null and not public.is_allowed_stream_url(p_stream_url) then
    raise exception 'Invalid stream URL: use HTTPS HLS (.m3u8), snapshot image, or YouTube — never RTSP/RTMP';
  end if;

  if p_status not in ('online', 'offline', 'paused') then
    raise exception 'Invalid camera status';
  end if;

  insert into public.cameras (id, region_id, name, location, status, stream_url, count_line)
  values (
    coalesce(p_id, gen_random_uuid()::text),
    p_region_id,
    p_name,
    p_location,
    p_status,
    nullif(trim(p_stream_url), ''),
    p_count_line
  )
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

-- ---------------------------------------------------------------------------
-- Camera-aware oracle snapshot
-- ---------------------------------------------------------------------------
create or replace function public.get_camera_region_raw(
  p_region_id text,
  p_metric text
)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_flow numeric;
  v_speed numeric;
  v_cong numeric;
begin
  select
    coalesce(avg(cm.flow_estimate), 0),
    coalesce(avg(cm.avg_speed_estimate), avg(r.avg_speed)),
    coalesce(avg(r.congestion), 0.5)
  into v_flow, v_speed, v_cong
  from public.camera_metrics cm
  join public.regions r on r.id = cm.region_id
  where cm.region_id = p_region_id
    and cm.recorded_at > now() - interval '5 minutes';

  if v_flow is null or v_flow = 0 then
    select flow, avg_speed, congestion into v_flow, v_speed, v_cong
    from public.regions where id = p_region_id;
  end if;

  return public.oracle_raw_metric(p_metric, v_flow::int, v_speed, v_cong);
end;
$$;

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
  v_raw numeric;
  v_use_camera boolean;
  v_cam_ok int;
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

  select coalesce(
    (select (value #>> '{}')::boolean from public.platform_settings where key = 'camera_oracle_enabled'),
    false
  ) into v_use_camera;

  if v_use_camera and coalesce(v_market.data_source, 'regions') = 'camera' then
    select count(*) into v_cam_ok
    from public.cameras
    where region_id = v_market.region_id
      and status = 'online'
      and detection_ok;

    if v_cam_ok < 1 then
      raise exception 'No online camera with detection for region %', v_market.region_id;
    end if;

    v_raw := public.get_camera_region_raw(v_market.region_id, v_metric);
  else
    v_raw := public.oracle_raw_metric(
      v_metric, v_region.flow, v_region.avg_speed, v_region.congestion
    );
  end if;

  insert into public.oracle_snapshots (
    market_id, region_id, raw_value, metric, source
  ) values (
    p_market_id, v_region.id, v_raw, v_metric, coalesce(v_market.data_source, 'regions')
  );

  return v_raw;
end;
$$;

-- ---------------------------------------------------------------------------
-- get_admin_oracle_health — include cameras per region
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
  v_cameras jsonb;
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

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'region_id', c.region_id,
      'id', c.id,
      'name', c.name,
      'status', c.status,
      'detection_ok', c.detection_ok,
      'stream_url', c.stream_url
    )
  ), '[]'::jsonb) into v_cameras
  from public.cameras c;

  select case when count(*) = 0 then 0
    else count(*) filter (where status = 'dispute')::numeric / count(*)::numeric
  end into v_dispute_rate
  from public.markets where status in ('settled', 'dispute', 'void');

  return jsonb_build_object(
    'regions', v_regions,
    'recent_snapshots', v_recent,
    'dispute_rate', v_dispute_rate,
    'cameras', v_cameras
  );
end;
$$;

-- List cameras for vision worker (service_role)
create or replace function public.list_cameras_for_ingest()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_result jsonb;
begin
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', c.id,
      'region_id', c.region_id,
      'stream_url', c.stream_url,
      'count_line', c.count_line,
      'status', c.status
    )
  ), '[]'::jsonb) into v_result
  from public.cameras c
  where c.status = 'online'
    and c.stream_url is not null;

  return v_result;
end;
$$;

revoke all on function public.list_cameras_for_ingest() from public;
grant execute on function public.list_cameras_for_ingest() to service_role;

-- Respect regions_simulator_enabled platform setting
create or replace function public.tick_region_simulator()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_enabled boolean;
  v_hour       int     := extract(hour from now() at time zone 'America/Sao_Paulo');
  v_rush       bool    := (v_hour between 7 and 9) or (v_hour between 17 and 20);
  v_flow_base  int     := case when v_rush then 5000 else 2200 end;
  v_speed_base numeric := case when v_rush then 18.0 else 48.0 end;
  v_cong_base  numeric := case when v_rush then 0.78 else 0.28 end;
begin
  select coalesce(
    (select (value #>> '{}')::boolean from public.platform_settings where key = 'regions_simulator_enabled'),
    true
  ) into v_enabled;

  if not v_enabled then
    return;
  end if;

  update public.regions set
    flow       = v_flow_base + floor(random() * 800 - 400)::int,
    avg_speed  = greatest(8, v_speed_base + (random() * 12 - 6)),
    congestion = least(0.99, greatest(0.05, v_cong_base + (random() * 0.18 - 0.09))),
    updated_at = now();
end;
$$;
