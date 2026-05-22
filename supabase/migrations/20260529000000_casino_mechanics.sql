-- Casino-style engagement: spin wheel, near-miss events, impulse deposits

do $$ begin
  create type public.spin_source as enum ('daily', 'deposit_bonus');
exception when duplicate_object then null;
end $$;

alter table public.profiles
  add column if not exists casino_opt_out boolean not null default false;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.user_spins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  spin_date date not null default (timezone('America/Sao_Paulo', now()))::date,
  source spin_source not null,
  outcome_key text not null,
  reward_amount numeric not null default 0,
  reward_xp int not null default 0,
  is_near_miss boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists user_spins_user_date on public.user_spins (user_id, spin_date desc);

create table if not exists public.user_near_miss_events (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  market_id text references public.markets(id) on delete set null,
  kind text not null default 'bet_loss',
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists user_near_miss_user_created on public.user_near_miss_events (user_id, created_at desc);

create table if not exists public.deposit_impulse_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric not null,
  context text not null,
  created_at timestamptz not null default now()
);

create index if not exists deposit_impulse_user_hour on public.deposit_impulse_log (user_id, created_at desc);

alter table public.user_spins enable row level security;
alter table public.user_near_miss_events enable row level security;
alter table public.deposit_impulse_log enable row level security;

create policy "user_spins_own" on public.user_spins for select using (auth.uid() = user_id);
create policy "user_near_miss_own" on public.user_near_miss_events for select using (auth.uid() = user_id);
create policy "deposit_impulse_own" on public.deposit_impulse_log for select using (auth.uid() = user_id);

insert into public.platform_settings (key, value) values
  ('casino_enabled', 'true'::jsonb),
  ('casino_spin_weights', '[
    {"key":"balance_25","weight":40,"balance":25,"xp":0,"near_miss":false},
    {"key":"xp_50","weight":25,"balance":0,"xp":50,"near_miss":false},
    {"key":"near_miss_jackpot","weight":20,"balance":0,"xp":0,"near_miss":true},
    {"key":"balance_75","weight":10,"balance":75,"xp":0,"near_miss":false},
    {"key":"balance_200","weight":5,"balance":200,"xp":0,"near_miss":false}
  ]'::jsonb),
  ('casino_deposit_bonus_min', '100'::jsonb),
  ('casino_impulse_max_per_hour', '3'::jsonb)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_casino_enabled()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select case jsonb_typeof(value)
        when 'boolean' then (value)::text::boolean
        else (value #>> '{}')::boolean
      end
      from public.platform_settings where key = 'casino_enabled'
    ),
    true
  );
$$;

create or replace function public.pick_casino_spin_outcome()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_weights jsonb;
  v_total numeric := 0;
  v_r numeric;
  v_acc numeric := 0;
  v_item jsonb;
begin
  select value into v_weights from public.platform_settings where key = 'casino_spin_weights';
  if v_weights is null then
    return jsonb_build_object('key', 'balance_25', 'balance', 25, 'xp', 0, 'near_miss', false);
  end if;

  select sum((elem->>'weight')::numeric) into v_total
  from jsonb_array_elements(v_weights) elem;

  v_r := random() * v_total;

  for v_item in select elem from jsonb_array_elements(v_weights) elem loop
    v_acc := v_acc + (v_item->>'weight')::numeric;
    if v_r <= v_acc then
      return v_item;
    end if;
  end loop;

  return v_weights->0;
end;
$$;

-- ---------------------------------------------------------------------------
-- casino_spin_status
-- ---------------------------------------------------------------------------
create or replace function public.casino_spin_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date := (timezone('America/Sao_Paulo', now()))::date;
  v_daily_done boolean;
  v_bonus_done boolean;
  v_opt_out boolean;
begin
  if v_user_id is null then return '{}'::jsonb; end if;

  select casino_opt_out into v_opt_out from public.profiles where id = v_user_id;

  select exists (
    select 1 from public.user_spins
    where user_id = v_user_id and spin_date = v_today and source = 'daily'
  ) into v_daily_done;

  select exists (
    select 1 from public.user_spins
    where user_id = v_user_id and spin_date = v_today and source = 'deposit_bonus'
  ) into v_bonus_done;

  return jsonb_build_object(
    'enabled', public.is_casino_enabled() and not v_opt_out,
    'daily_available', not v_daily_done,
    'deposit_bonus_available', not v_bonus_done,
    'opt_out', v_opt_out
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- casino_daily_spin / casino_deposit_bonus_spin
-- ---------------------------------------------------------------------------
create or replace function public._casino_execute_spin(p_source spin_source)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date := (timezone('America/Sao_Paulo', now()))::date;
  v_outcome jsonb;
  v_balance numeric := 0;
  v_xp int := 0;
  v_near_miss boolean;
  v_key text;
begin
  if v_user_id is null then raise exception 'Unauthorized'; end if;
  if not public.is_casino_enabled() then
    raise exception 'Casino mode disabled';
  end if;
  if exists (select 1 from public.profiles where id = v_user_id and casino_opt_out) then
    raise exception 'Casino opt-out active';
  end if;

  if exists (
    select 1 from public.user_spins
    where user_id = v_user_id and spin_date = v_today and source = p_source
  ) then
    return jsonb_build_object('already_spun', true, 'source', p_source);
  end if;

  v_outcome := public.pick_casino_spin_outcome();
  v_key := v_outcome->>'key';
  v_balance := coalesce((v_outcome->>'balance')::numeric, 0);
  v_xp := coalesce((v_outcome->>'xp')::int, 0);
  v_near_miss := coalesce((v_outcome->>'near_miss')::boolean, false);

  insert into public.user_spins (user_id, spin_date, source, outcome_key, reward_amount, reward_xp, is_near_miss)
  values (v_user_id, v_today, p_source, v_key, v_balance, v_xp, v_near_miss);

  if v_balance > 0 then
    perform public.wallet_deposit(v_balance);
  end if;
  if v_xp > 0 then
    perform public.apply_user_progress(v_user_id, 'casino_spin', v_xp);
  end if;

  return jsonb_build_object(
    'outcome_key', v_key,
    'balance', v_balance,
    'xp', v_xp,
    'is_near_miss', v_near_miss,
    'label', case v_key
      when 'balance_25' then '+R$ 25 de saldo'
      when 'balance_75' then '+R$ 75 de saldo'
      when 'balance_200' then '+R$ 200 de saldo'
      when 'xp_50' then '+50 XP'
      when 'near_miss_jackpot' then 'Quase no jackpot!'
      else v_key
    end
  );
end;
$$;

create or replace function public.casino_daily_spin()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public._casino_execute_spin('daily');
end;
$$;

create or replace function public.casino_deposit_bonus_spin()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public._casino_execute_spin('deposit_bonus');
end;
$$;

-- ---------------------------------------------------------------------------
-- casino_quick_deposit
-- ---------------------------------------------------------------------------
create or replace function public.casino_quick_deposit(p_amount numeric, p_context text default 'low_balance')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_max_hour int;
  v_count int;
  v_deposit jsonb;
  v_bonus jsonb := '{}'::jsonb;
  v_min_bonus numeric;
begin
  if v_user_id is null then raise exception 'Unauthorized'; end if;
  if not public.is_casino_enabled() then
    return public.wallet_deposit(p_amount);
  end if;
  if exists (select 1 from public.profiles where id = v_user_id and casino_opt_out) then
    return public.wallet_deposit(p_amount);
  end if;

  select coalesce((value #>> '{}')::int, 3) into v_max_hour
  from public.platform_settings where key = 'casino_impulse_max_per_hour';

  select count(*) into v_count
  from public.deposit_impulse_log
  where user_id = v_user_id and created_at >= now() - interval '1 hour';

  if v_count >= v_max_hour then
    raise exception 'Limite de recargas rápidas atingido. Tente novamente em alguns minutos.';
  end if;

  v_deposit := public.wallet_deposit(p_amount);

  insert into public.deposit_impulse_log (user_id, amount, context)
  values (v_user_id, p_amount, coalesce(p_context, 'low_balance'));

  select coalesce((value #>> '{}')::numeric, 100) into v_min_bonus
  from public.platform_settings where key = 'casino_deposit_bonus_min';

  if p_amount >= v_min_bonus then
    v_bonus := public.casino_deposit_bonus_spin();
  end if;

  return v_deposit || jsonb_build_object('impulse_context', p_context, 'bonus_spin', v_bonus);
end;
$$;

-- ---------------------------------------------------------------------------
-- Near-miss on loss (extend payout trigger)
-- ---------------------------------------------------------------------------
create or replace function public.trg_bets_on_payout()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market markets%rowtype;
  v_won_vs_ai boolean;
  v_total_pool numeric;
  v_near boolean;
begin
  if old.payout is not null or new.payout is null then
    return new;
  end if;

  select * into v_market from public.markets where id = new.market_id;

  if new.payout > 0 then
    perform public.apply_user_progress(new.user_id, 'bet_won', 200);
    v_won_vs_ai := new.side is distinct from v_market.ai_side;
    if v_won_vs_ai then
      update public.user_ai_memory
      set wins_vs_ai = wins_vs_ai + 1, updated_at = now()
      where user_id = new.user_id;
    end if;
  else
    perform public.apply_user_progress(new.user_id, 'bet_lost', 25);

    if public.is_casino_enabled() then
      v_total_pool := v_market.pool_yes + v_market.pool_no;
      if v_total_pool > 0 then
        v_near := coalesce(new.share, 0) >= 0.35
          or abs(v_market.pool_yes / v_total_pool - 0.5) <= 0.08
          or new.stake / v_total_pool >= 0.08;
      else
        v_near := new.stake >= 50;
      end if;

      if v_near then
        insert into public.user_near_miss_events (user_id, market_id, kind, meta)
        values (
          new.user_id,
          new.market_id,
          'bet_loss',
          jsonb_build_object(
            'stake', new.stake,
            'side', new.side,
            'resolved', v_market.resolved,
            'share', new.share
          )
        );
      end if;
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.get_recent_near_miss()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row record;
begin
  if v_user_id is null then return null; end if;

  select e.id, e.market_id, e.kind, e.meta, e.created_at, m.question, m.region
  into v_row
  from public.user_near_miss_events e
  left join public.markets m on m.id = e.market_id
  where e.user_id = v_user_id
  order by e.created_at desc
  limit 1;

  if not found then return null; end if;

  return jsonb_build_object(
    'id', v_row.id,
    'market_id', v_row.market_id,
    'question', v_row.question,
    'region', v_row.region,
    'meta', v_row.meta,
    'created_at', v_row.created_at
  );
end;
$$;

create or replace function public.set_casino_opt_out(p_opt_out boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Unauthorized'; end if;
  update public.profiles set casino_opt_out = p_opt_out where id = v_user_id;
  return jsonb_build_object('opt_out', p_opt_out);
end;
$$;

grant execute on function public.is_casino_enabled() to authenticated;
grant execute on function public.casino_spin_status() to authenticated;
grant execute on function public.casino_daily_spin() to authenticated;
grant execute on function public.casino_deposit_bonus_spin() to authenticated;
grant execute on function public.casino_quick_deposit(numeric, text) to authenticated;
grant execute on function public.get_recent_near_miss() to authenticated;
grant execute on function public.set_casino_opt_out(boolean) to authenticated;
