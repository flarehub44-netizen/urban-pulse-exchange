-- Phases 1–4 completion: extend/pause markets, lifecycle trigger, simulator apply, audit log, KYC, exposure

-- ---------------------------------------------------------------------------
-- admin_extend_market
-- ---------------------------------------------------------------------------
create or replace function public.admin_extend_market(
  p_market_id text,
  p_extra_hours int default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();
  if p_extra_hours < 1 or p_extra_hours > 168 then
    raise exception 'extra_hours must be between 1 and 168';
  end if;
  update public.markets
  set ends_at = coalesce(ends_at, now()) + (p_extra_hours || ' hours')::interval,
      updated_at = now()
  where id = p_market_id and status in ('draft', 'live', 'closing');
  if not found then raise exception 'Market not found or not extendable'; end if;
  insert into public.admin_actions (admin_id, action, target_type, target_id, payload)
  values (auth.uid(), 'extend_market', 'market', p_market_id,
    jsonb_build_object('extra_hours', p_extra_hours));
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- admin_pause_bets (freeze entries without full frozen flag)
-- ---------------------------------------------------------------------------
create or replace function public.admin_pause_bets(p_market_id text, p_paused boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();
  update public.markets
  set accept_bets = not p_paused, updated_at = now()
  where id = p_market_id and status in ('live', 'closing');
  if not found then raise exception 'Market not found or not pausable'; end if;
  insert into public.admin_actions (admin_id, action, target_type, target_id, payload)
  values (auth.uid(), 'pause_bets', 'market', p_market_id, jsonb_build_object('paused', p_paused));
  return jsonb_build_object('ok', true, 'accept_bets', not p_paused);
end;
$$;

-- ---------------------------------------------------------------------------
-- admin_trigger_lifecycle — manual tick
-- ---------------------------------------------------------------------------
create or replace function public.admin_trigger_lifecycle()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_result jsonb;
begin
  perform public.assert_admin();
  v_result := public.tick_market_lifecycle();
  insert into public.admin_actions (admin_id, action, target_type, payload)
  values (auth.uid(), 'trigger_lifecycle', 'system', v_result);
  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- admin_apply_simulator_scenario — override regions for testing
-- ---------------------------------------------------------------------------
create or replace function public.admin_apply_simulator_scenario(
  p_rush boolean default false,
  p_rain boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_flow_base  int     := case when p_rush then 5200 else 2200 end;
  v_speed_base numeric := case when p_rush then 18.0 else 48.0 end;
  v_cong_base  numeric := case when p_rush then 0.78 else 0.28 end;
  v_rain_mult  numeric := case when p_rain then 0.82 else 1.0 end;
begin
  perform public.assert_admin();
  update public.regions set
    flow       = floor((v_flow_base * v_rain_mult) + (random() * 400 - 200))::int,
    avg_speed  = greatest(8, (v_speed_base * v_rain_mult) + (random() * 8 - 4)),
    congestion = least(0.99, greatest(0.05, v_cong_base + (random() * 0.12 - 0.06))),
    updated_at = now();
  perform public.tick_region_simulator();
  insert into public.admin_actions (admin_id, action, target_type, payload)
  values (auth.uid(), 'apply_simulator', 'regions',
    jsonb_build_object('rush', p_rush, 'rain', p_rain));
  return jsonb_build_object('ok', true, 'regions_updated', (select count(*) from public.regions));
end;
$$;

-- ---------------------------------------------------------------------------
-- get_admin_volume_by_region (overview heatmap)
-- ---------------------------------------------------------------------------
create or replace function public.get_admin_volume_by_region()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_result jsonb;
begin
  perform public.assert_admin();
  select coalesce(jsonb_agg(row_to_json(t) order by t.volume desc), '[]'::jsonb) into v_result
  from (
    select coalesce(m.region, '—') as region,
           coalesce(sum(b.stake), 0)::numeric as volume,
           count(distinct b.id)::int as bet_count
    from public.bets b
    join public.markets m on m.id = b.market_id
    where b.created_at >= date_trunc('day', now() at time zone 'America/Sao_Paulo')
    group by m.region
  ) t;
  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- get_admin_open_exposure
-- ---------------------------------------------------------------------------
create or replace function public.get_admin_open_exposure()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();
  return jsonb_build_object(
    'open_pool_total', (
      select coalesce(sum(pool_yes + pool_no), 0) from public.markets
      where status in ('live', 'closing', 'closed') and archived = false
    ),
    'open_bets_total', (
      select coalesce(sum(stake), 0) from public.bets b
      join public.markets m on m.id = b.market_id
      where m.status in ('live', 'closing') and b.payout is null
    ),
    'markets_with_bets', (
      select count(distinct market_id)::int from public.bets b
      join public.markets m on m.id = b.market_id where m.status in ('live', 'closing')
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- get_admin_actions_log
-- ---------------------------------------------------------------------------
create or replace function public.get_admin_actions_log(p_limit int default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_result jsonb;
begin
  perform public.assert_admin();
  select coalesce(jsonb_agg(row_to_json(x) order by x.created_at desc), '[]'::jsonb) into v_result
  from (
    select a.id, a.action, a.target_type, a.target_id, a.payload, a.created_at,
           p.username as admin_username
    from public.admin_actions a
    left join public.profiles p on p.id = a.admin_id
    order by a.created_at desc
    limit greatest(1, least(p_limit, 200))
  ) x;
  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- admin_update_kyc_status
-- ---------------------------------------------------------------------------
create or replace function public.admin_update_kyc_status(
  p_user_id uuid,
  p_status text,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();
  if p_status not in ('none', 'pending', 'verified', 'rejected') then
    raise exception 'Invalid kyc status';
  end if;
  insert into public.user_risk_profiles (user_id, kyc_status, notes)
  values (p_user_id, p_status, p_notes)
  on conflict (user_id) do update set
    kyc_status = excluded.kyc_status,
    notes = coalesce(excluded.notes, user_risk_profiles.notes),
    updated_at = now();
  insert into public.admin_actions (admin_id, action, target_type, target_id, payload)
  values (auth.uid(), 'update_kyc', 'profile', p_user_id::text,
    jsonb_build_object('status', p_status));
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- admin_set_camera_status
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_camera_status(
  p_camera_id text,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();
  if p_status not in ('online', 'offline', 'paused') then
    raise exception 'Invalid camera status';
  end if;
  update public.cameras set status = p_status, updated_at = now() where id = p_camera_id;
  if not found then raise exception 'Camera not found'; end if;
  insert into public.admin_actions (admin_id, action, target_type, target_id, payload)
  values (auth.uid(), 'camera_status', 'camera', p_camera_id, jsonb_build_object('status', p_status));
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_extend_market(text, int) to authenticated;
grant execute on function public.admin_pause_bets(text, boolean) to authenticated;
grant execute on function public.admin_trigger_lifecycle() to authenticated;
grant execute on function public.admin_apply_simulator_scenario(boolean, boolean) to authenticated;
grant execute on function public.get_admin_volume_by_region() to authenticated;
grant execute on function public.get_admin_open_exposure() to authenticated;
grant execute on function public.get_admin_actions_log(int) to authenticated;
grant execute on function public.admin_update_kyc_status(uuid, text, text) to authenticated;
grant execute on function public.admin_set_camera_status(text, text) to authenticated;
