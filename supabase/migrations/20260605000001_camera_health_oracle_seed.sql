-- Camera health RPC (admin) + demo markets wired to camera data_source

create or replace function public.get_camera_health()
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
      'name', c.name,
      'region_id', c.region_id,
      'status', c.status,
      'detection_ok', c.detection_ok,
      'stream_host', split_part(split_part(c.stream_url, '://', 2), '/', 1),
      'last_metric_at', lm.recorded_at,
      'minutes_stale', case
        when lm.recorded_at is null then null
        else extract(epoch from (now() - lm.recorded_at)) / 60
      end,
      'is_stale', (
        c.detection_ok
        and (lm.recorded_at is null or lm.recorded_at < now() - interval '10 minutes')
      )
    ) order by c.name
  ), '[]'::jsonb) into v_result
  from public.cameras c
  left join lateral (
    select recorded_at
    from public.camera_metrics
    where camera_id = c.id
    order by recorded_at desc
    limit 1
  ) lm on true;

  return v_result;
end;
$$;

grant execute on function public.get_camera_health() to authenticated;

-- Demo live markets: use camera oracle when enabled
update public.markets
set data_source = 'camera'
where id in (
  'paulista-rush-live',
  'marginal-tiete-live',
  'pinheiros-flow-live',
  'backup-paulista-live',
  'backup-marginal-live',
  'backup-pinheiros-live'
)
and status in ('live', 'closing');
