-- Camera pipeline acceptance (run: psql $DATABASE_URL -f supabase/tests/camera_pipeline_acceptance.sql)
\set ON_ERROR_STOP on

begin;

-- Seed camera on paulista
insert into public.cameras (id, region_id, name, status, stream_url, count_line, detection_ok)
values (
  'test-cam-paulista',
  'paulista',
  'Test Cam Paulista',
  'online',
  'https://example.com/live/index.m3u8',
  '{"x1":0.1,"y1":0.5,"x2":0.9,"y2":0.5}'::jsonb,
  false
)
on conflict (id) do update set
  status = 'online',
  stream_url = excluded.stream_url,
  detection_ok = false;

select public.ingest_camera_metrics('test-cam-paulista', 12, 0.82);

do $$
declare
  v_flow int;
  v_det boolean;
begin
  select flow into v_flow from public.regions where id = 'paulista';
  if v_flow is null or v_flow < 1 then
    raise exception 'regions.flow not updated after ingest';
  end if;

  select detection_ok into v_det from public.cameras where id = 'test-cam-paulista';
  if not v_det then
    raise exception 'cameras.detection_ok not set';
  end if;
end;
$$;

-- list_live_cameras returns public fields only
do $$
declare
  v jsonb;
begin
  v := public.list_live_cameras('paulista');
  if jsonb_array_length(v) < 1 then
    raise exception 'list_live_cameras empty';
  end if;
end;
$$;

-- URL validation
do $$
begin
  if public.is_allowed_stream_url('rtsp://secret') then
    raise exception 'rtsp should be rejected';
  end if;
  if not public.is_allowed_stream_url('https://cdn.test/index.m3u8') then
    raise exception 'hls https should be allowed';
  end if;
end;
$$;

rollback;

\echo 'camera_pipeline_acceptance: OK'
