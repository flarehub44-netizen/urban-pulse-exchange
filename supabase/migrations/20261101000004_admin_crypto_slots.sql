-- Admin BFF grants for prediction markets + performance indexes

revoke execute on function public.admin_create_prediction_market(
  text, text, public.market_vertical, timestamptz, jsonb, text, text, boolean
) from public, anon, authenticated;
grant execute on function public.admin_create_prediction_market(
  text, text, public.market_vertical, timestamptz, jsonb, text, text, boolean
) to service_role;

-- Allow admin via service role only; browser uses BFF with service role key server-side

create index if not exists prediction_markets_collection_status_idx
  on public.prediction_markets (collection_slug, status)
  where collection_slug is not null;

create index if not exists market_topic_assignments_market_idx
  on public.market_topic_assignments (market_id, source);

-- Crypto short-term slot markets (binary recurring)
create table if not exists public.crypto_slot_markets (
  id           text primary key,
  question     text not null,
  status       public.market_status not null default 'live',
  pool_up      numeric(14,2) not null default 0,
  pool_down    numeric(14,2) not null default 0,
  slot_start   timestamptz not null,
  slot_end     timestamptz not null,
  participants int not null default 0,
  resolved     text,
  created_at   timestamptz not null default now()
);

alter table public.crypto_slot_markets enable row level security;

create policy crypto_slot_markets_read on public.crypto_slot_markets
  for select to anon, authenticated using (true);

create or replace function public.cron_open_crypto_slot(
  p_interval_minutes int default 15
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_enabled jsonb;
  v_id text;
  v_start timestamptz := date_trunc('minute', now());
  v_end timestamptz := v_start + (p_interval_minutes || ' minutes')::interval;
begin
  select value into v_enabled from public.platform_settings where key = 'crypto_short_term_enabled';
  if coalesce(v_enabled::text, 'false') not in ('true', '"true"') then
    return jsonb_build_object('skipped', true);
  end if;

  v_id := 'cs-' || to_char(v_start, 'YYYYMMDDHH24MI');
  insert into public.crypto_slot_markets (id, question, slot_start, slot_end, status)
  values (
    v_id,
    'BTC sobe ou desce em ' || p_interval_minutes || ' min',
    v_start,
    v_end,
    'live'
  )
  on conflict (id) do nothing;

  return jsonb_build_object('id', v_id, 'slot_end', v_end);
end;
$$;

revoke execute on function public.cron_open_crypto_slot(int) from public, anon, authenticated;
grant execute on function public.cron_open_crypto_slot(int) to service_role;

create or replace function public.place_crypto_slot_bet(
  p_market_id text,
  p_side text,
  p_stake numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_m public.crypto_slot_markets%rowtype;
  v_profile public.profiles%rowtype;
begin
  if v_user_id is null then raise exception 'Unauthorized'; end if;
  if p_side not in ('up', 'down') then raise exception 'Invalid side'; end if;
  if p_stake <= 0 then raise exception 'Stake must be positive'; end if;

  select * into v_profile from public.profiles where id = v_user_id for update;
  if v_profile.balance < p_stake then raise exception 'Insufficient balance'; end if;

  select * into v_m from public.crypto_slot_markets where id = p_market_id for update;
  if not found then raise exception 'Market not found'; end if;
  if v_m.status <> 'live' or now() >= v_m.slot_end then raise exception 'Slot closed'; end if;

  update public.profiles set balance = balance - p_stake where id = v_user_id;

  if p_side = 'up' then
    update public.crypto_slot_markets set pool_up = pool_up + p_stake, participants = participants + 1 where id = p_market_id;
  else
    update public.crypto_slot_markets set pool_down = pool_down + p_stake, participants = participants + 1 where id = p_market_id;
  end if;

  return jsonb_build_object('balance', v_profile.balance - p_stake);
end;
$$;

revoke execute on function public.place_crypto_slot_bet(text, text, numeric) from public, anon, authenticated;
grant execute on function public.place_crypto_slot_bet(text, text, numeric) to authenticated;
