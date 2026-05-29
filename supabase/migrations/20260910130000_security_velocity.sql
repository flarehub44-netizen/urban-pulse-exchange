-- Security velocity: audit trail + IP/device rate limits via service_assert_rate_limit.

create table if not exists public.security_velocity_events (
  id bigserial primary key,
  action text not null check (action in ('signup', 'deposit', 'withdraw', 'login')),
  user_id uuid references public.profiles(id) on delete set null,
  ip_hash text not null,
  device_hash text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists security_velocity_events_ip_action_created_idx
  on public.security_velocity_events (ip_hash, action, created_at desc);

create index if not exists security_velocity_events_device_action_created_idx
  on public.security_velocity_events (device_hash, action, created_at desc)
  where device_hash is not null;

alter table public.security_velocity_events enable row level security;

drop policy if exists security_velocity_events_deny_all on public.security_velocity_events;
create policy security_velocity_events_deny_all
  on public.security_velocity_events
  for all
  to authenticated
  using (false)
  with check (false);

insert into public.platform_settings (key, value) values
  ('velocity_withdraw_ip_max', '10'::jsonb),
  ('velocity_deposit_ip_max', '20'::jsonb),
  ('velocity_signup_ip_max', '5'::jsonb),
  ('velocity_window_seconds', '86400'::jsonb),
  ('fraud_cluster_min_accounts', '3'::jsonb),
  ('fraud_cluster_sweep_dry_run', 'true'::jsonb)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Record velocity event (audit; no PII in clear text)
-- ---------------------------------------------------------------------------
create or replace function public.service_record_velocity_event(
  p_action text,
  p_user_id uuid default null,
  p_ip_hash text default null,
  p_device_hash text default null,
  p_meta jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_action is null or length(trim(p_action)) = 0 then
    return;
  end if;
  if p_ip_hash is null or length(trim(p_ip_hash)) = 0 then
    return;
  end if;

  insert into public.security_velocity_events (
    action, user_id, ip_hash, device_hash, meta
  )
  values (
    trim(p_action),
    p_user_id,
    trim(p_ip_hash),
    nullif(trim(coalesce(p_device_hash, '')), ''),
    coalesce(p_meta, '{}'::jsonb)
  );
end;
$$;

revoke execute on function public.service_record_velocity_event(text, uuid, text, text, jsonb) from public;
grant execute on function public.service_record_velocity_event(text, uuid, text, text, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- Assert IP velocity for an action (uses request_rate_limits under the hood)
-- ---------------------------------------------------------------------------
create or replace function public.service_assert_velocity_limit(
  p_action text,
  p_ip_hash text,
  p_device_hash text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max int;
  v_window int;
  v_setting_key text;
  v_rl jsonb;
begin
  if p_action is null or length(trim(p_action)) = 0 then
    raise exception 'velocity action required';
  end if;
  if p_ip_hash is null or length(trim(p_ip_hash)) = 0 then
    return jsonb_build_object('limited', false, 'skipped', true, 'reason', 'no_ip_hash');
  end if;

  v_setting_key := 'velocity_' || trim(p_action) || '_ip_max';
  v_max := coalesce(
    public.partner_setting_num(v_setting_key, 0)::int,
    0
  );
  v_window := coalesce(
    public.partner_setting_num('velocity_window_seconds', 86400)::int,
    86400
  );

  if v_max <= 0 then
    return jsonb_build_object('limited', false, 'skipped', true, 'reason', 'disabled');
  end if;

  v_rl := public.service_assert_rate_limit(
    'velocity:' || trim(p_action) || ':ip:' || trim(p_ip_hash),
    v_max,
    v_window
  );

  return v_rl;
end;
$$;

revoke execute on function public.service_assert_velocity_limit(text, text, text) from public;
grant execute on function public.service_assert_velocity_limit(text, text, text) to service_role;
