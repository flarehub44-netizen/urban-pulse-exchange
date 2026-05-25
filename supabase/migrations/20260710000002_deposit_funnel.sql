-- Deposit funnel: metrics, first_deposit_at on profiles, nudge, social proof anon

alter table public.profiles
  add column if not exists first_deposit_at timestamptz,
  add column if not exists deposit_nudge_sent_at timestamptz;

-- ---------------------------------------------------------------------------
-- Funnel events
-- ---------------------------------------------------------------------------
create table if not exists public.deposit_funnel_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  session_id text,
  event text not null check (
    event in (
      'auth_modal_open',
      'signup_complete',
      'deposit_sheet_open',
      'deposit_qr_shown',
      'deposit_paid'
    )
  ),
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists deposit_funnel_events_event_created_idx
  on public.deposit_funnel_events (event, created_at desc);

create index if not exists deposit_funnel_events_user_created_idx
  on public.deposit_funnel_events (user_id, created_at desc)
  where user_id is not null;

alter table public.deposit_funnel_events enable row level security;

drop policy if exists deposit_funnel_events_insert on public.deposit_funnel_events;
create policy deposit_funnel_events_insert on public.deposit_funnel_events
  for insert to authenticated, anon
  with check (user_id is null or user_id = auth.uid());

drop policy if exists deposit_funnel_events_admin_select on public.deposit_funnel_events;
create policy deposit_funnel_events_admin_select on public.deposit_funnel_events
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- ---------------------------------------------------------------------------
-- Track event (client)
-- ---------------------------------------------------------------------------
create or replace function public.track_deposit_funnel_event(
  p_event text,
  p_props jsonb default '{}'::jsonb,
  p_session_id text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_event not in (
    'auth_modal_open', 'signup_complete', 'deposit_sheet_open',
    'deposit_qr_shown', 'deposit_paid'
  ) then
    raise exception 'invalid funnel event: %', p_event;
  end if;

  insert into public.deposit_funnel_events (user_id, session_id, event, props)
  values (auth.uid(), p_session_id, p_event, coalesce(p_props, '{}'::jsonb));
end;
$$;

grant execute on function public.track_deposit_funnel_event(text, jsonb, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Unified deposit check
-- ---------------------------------------------------------------------------
create or replace function public.user_has_deposited()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case when auth.uid() is null then false else (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.first_deposit_at is not null
    )
    or exists (
      select 1 from public.transactions t
      where t.user_id = auth.uid()
        and t.type = 'deposit'
        and t.amount > 0
    )
  ) end;
$$;

grant execute on function public.user_has_deposited() to authenticated;

-- ---------------------------------------------------------------------------
-- Credit path: set first_deposit_at
-- ---------------------------------------------------------------------------
create or replace function public.service_credit_balance(
  p_user_id  uuid,
  p_amount   numeric,
  p_intent_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance_after numeric;
begin
  update public.profiles
  set
    balance = balance + p_amount,
    first_deposit_at = coalesce(first_deposit_at, now())
  where id = p_user_id
  returning balance into v_balance_after;

  if not found then
    raise exception 'Profile not found: %', p_user_id;
  end if;

  insert into public.transactions (
    user_id, type, amount, market_label,
    before_balance, after_balance
  )
  values (
    p_user_id, 'deposit', p_amount, 'Depósito Pix',
    v_balance_after - p_amount,
    v_balance_after
  );

  insert into public.notifications (user_id, kind, text)
  values (
    p_user_id, 'alert',
    'Depósito de ' || p_amount::text || ' BRL confirmado!'
  );

  perform public.maybe_pay_partner_cpa(p_user_id, p_amount);
end;
$$;

create or replace function public.wallet_deposit(p_amount numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid         uuid := auth.uid();
  v_tx_id       uuid;
  v_balance_after numeric;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;
  if p_amount > 500000 then raise exception 'Amount exceeds limit'; end if;

  update public.profiles
  set
    balance = balance + p_amount,
    first_deposit_at = coalesce(first_deposit_at, now())
  where id = v_uid
  returning balance into v_balance_after;

  insert into public.transactions (
    user_id, type, amount, market_label,
    before_balance, after_balance
  )
  values (
    v_uid, 'deposit', p_amount, 'Carteira',
    v_balance_after - p_amount,
    v_balance_after
  )
  returning id into v_tx_id;

  perform public.maybe_pay_partner_cpa(v_uid, p_amount);

  return jsonb_build_object('tx_id', v_tx_id, 'balance', v_balance_after);
end;
$$;

-- ---------------------------------------------------------------------------
-- 24h deposit nudge (idempotent)
-- ---------------------------------------------------------------------------
create or replace function public.maybe_send_deposit_nudge()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'unauthorized');
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_profile');
  end if;

  if v_profile.first_deposit_at is not null
     or public.user_has_deposited() then
    return jsonb_build_object('ok', false, 'reason', 'already_deposited');
  end if;

  if v_profile.deposit_nudge_sent_at is not null then
    return jsonb_build_object('ok', false, 'reason', 'already_sent');
  end if;

  if v_profile.created_at > now() - interval '24 hours' then
    return jsonb_build_object('ok', false, 'reason', 'too_early');
  end if;

  insert into public.notifications (user_id, kind, text, market_id)
  values (
    v_uid,
    'alert',
    'Você ainda não depositou — adicione saldo via Pix para fazer sua primeira previsão.',
    null
  );

  update public.profiles
  set deposit_nudge_sent_at = now()
  where id = v_uid;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.maybe_send_deposit_nudge() to authenticated;

-- ---------------------------------------------------------------------------
-- Admin funnel metrics
-- ---------------------------------------------------------------------------
create or replace function public.admin_get_deposit_funnel_metrics(p_days int default 7)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_since timestamptz := now() - (greatest(1, least(p_days, 90)) || ' days')::interval;
  v_counts jsonb;
  v_signups int;
  v_paid int;
begin
  perform public.assert_admin();

  select coalesce(jsonb_object_agg(event, cnt), '{}'::jsonb)
  into v_counts
  from (
    select event, count(*)::int as cnt
    from public.deposit_funnel_events
    where created_at >= v_since
    group by event
  ) s;

  select count(*)::int into v_signups
  from public.deposit_funnel_events
  where event = 'signup_complete' and created_at >= v_since;

  select count(*)::int into v_paid
  from public.deposit_funnel_events
  where event = 'deposit_paid' and created_at >= v_since;

  return jsonb_build_object(
    'since', v_since,
    'counts', v_counts,
    'signup_complete', v_signups,
    'deposit_paid', v_paid,
    'conversion_pct', case when v_signups > 0
      then round((v_paid::numeric / v_signups) * 100, 2)
      else 0 end
  );
end;
$$;

grant execute on function public.admin_get_deposit_funnel_metrics(int) to authenticated;

-- Social proof on public market pages
grant execute on function public.get_market_social_proof(text) to anon;

-- Backfill first_deposit_at from existing deposits
update public.profiles p
set first_deposit_at = sub.min_at
from (
  select user_id, min(created_at) as min_at
  from public.transactions
  where type = 'deposit' and amount > 0
  group by user_id
) sub
where p.id = sub.user_id
  and p.first_deposit_at is null;
