-- CPA production antifraud:
-- - CPA accrual with release on day 8 of the following month (America/Sao_Paulo)
-- - SyncPay payer CPF capture + duplicate/invalid heuristics
-- - Soft-ban (no hard delete) for confirmed CPA fraud users
-- - Account guards on place_bet and request_withdrawal

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists banned_at timestamptz,
  add column if not exists ban_reason text,
  add column if not exists deleted_at timestamptz;

comment on column public.profiles.banned_at is 'Soft-ban: blocks betting and withdrawals; profile retained for audit.';
comment on column public.profiles.deleted_at is 'Soft-delete marker; profile row kept.';

alter table public.partner_commission_ledger
  add column if not exists withdrawable_at timestamptz,
  add column if not exists released_to_balance_at timestamptz;

create table if not exists public.user_payment_identities (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  cpf_hash text,
  cpf_last4 text,
  document_source text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists user_payment_identities_cpf_hash_uniq
  on public.user_payment_identities(cpf_hash)
  where cpf_hash is not null;

alter table public.user_payment_identities enable row level security;

drop policy if exists user_payment_identities_deny_all on public.user_payment_identities;
create policy user_payment_identities_deny_all
  on public.user_payment_identities
  for all
  to authenticated
  using (false)
  with check (false);

-- Legacy CPA rows were credited immediately to balance.
update public.partner_commission_ledger
set
  withdrawable_at = coalesce(withdrawable_at, created_at),
  released_to_balance_at = coalesce(released_to_balance_at, created_at)
where kind = 'cpa'
  and withdrawable_at is null;

-- ---------------------------------------------------------------------------
-- CPF helpers
-- ---------------------------------------------------------------------------
create or replace function public.normalize_cpf_digits(p_document text)
returns text
language sql
immutable
as $$
  select nullif(regexp_replace(coalesce(p_document, ''), '\D', '', 'g'), '');
$$;

create or replace function public.is_valid_cpf(p_document text)
returns boolean
language plpgsql
immutable
as $$
declare
  v_cpf text := public.normalize_cpf_digits(p_document);
  v_sum int;
  v_rest int;
  v_i int;
begin
  if v_cpf is null or length(v_cpf) <> 11 then
    return false;
  end if;
  if v_cpf ~ '^(\d)\1{10}$' then
    return false;
  end if;

  v_sum := 0;
  for v_i in 1..9 loop
    v_sum := v_sum + substr(v_cpf, v_i, 1)::int * (11 - v_i);
  end loop;
  v_rest := (v_sum * 10) % 11;
  if v_rest = 10 then v_rest := 0; end if;
  if v_rest <> substr(v_cpf, 10, 1)::int then
    return false;
  end if;

  v_sum := 0;
  for v_i in 1..10 loop
    v_sum := v_sum + substr(v_cpf, v_i, 1)::int * (12 - v_i);
  end loop;
  v_rest := (v_sum * 10) % 11;
  if v_rest = 10 then v_rest := 0; end if;

  return v_rest = substr(v_cpf, 11, 1)::int;
end;
$$;

create or replace function public.hash_cpf_document(p_document text)
returns text
language sql
immutable
as $$
  select case
    when public.normalize_cpf_digits(p_document) is null then null
    else encode(
      extensions.digest(convert_to(public.normalize_cpf_digits(p_document), 'UTF8'), 'sha256'),
      'hex'
    )
  end;
$$;

create or replace function public.syncpay_extract_payer_document(p_payload jsonb)
returns text
language sql
immutable
as $$
  select nullif(trim(coalesce(
    p_payload #>> '{data,debtor_account,document}',
    p_payload #>> '{data,payer,document}',
    p_payload #>> '{debtor_account,document}',
    p_payload #>> '{payer,document}',
    ''
  )), '');
$$;

-- ---------------------------------------------------------------------------
-- Account status
-- ---------------------------------------------------------------------------
create or replace function public.assert_user_account_active(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_frozen boolean := false;
begin
  if p_user_id is null then
    raise exception 'Unauthorized';
  end if;

  select * into v_profile from public.profiles where id = p_user_id;
  if not found then
    raise exception 'Profile not found';
  end if;

  if v_profile.banned_at is not null or v_profile.deleted_at is not null then
    raise exception 'account_suspended: conta suspensa por compliance';
  end if;

  select coalesce(urp.frozen, false) into v_frozen
  from public.user_risk_profiles urp
  where urp.user_id = p_user_id;

  if v_frozen then
    raise exception 'account_frozen: conta congelada';
  end if;
end;
$$;

revoke execute on function public.assert_user_account_active(uuid) from public;
grant execute on function public.assert_user_account_active(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- CPA release schedule (day 8 of the following calendar month, BRT)
-- ---------------------------------------------------------------------------
create or replace function public.partner_cpa_withdrawable_at(p_qualified_at timestamptz)
returns timestamptz
language sql
immutable
as $$
  select (
    (
      date_trunc(
        'month',
        (p_qualified_at at time zone 'America/Sao_Paulo')::date
      )::date
      + interval '1 month'
      + interval '7 days'
    )::timestamp
    at time zone 'America/Sao_Paulo'
  );
$$;

create or replace function public.partner_release_mature_cpa(p_partner_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_total_released numeric := 0;
  v_partners int := 0;
begin
  for v_row in
    select l.partner_id, coalesce(sum(l.amount), 0)::numeric as due_amount
    from public.partner_commission_ledger l
    where l.kind = 'cpa'
      and l.released_to_balance_at is null
      and l.withdrawable_at is not null
      and l.withdrawable_at <= now()
      and (p_partner_id is null or l.partner_id = p_partner_id)
    group by l.partner_id
    having coalesce(sum(l.amount), 0) > 0
  loop
    update public.partner_accounts
    set
      balance = balance + v_row.due_amount,
      pending_balance = greatest(0, pending_balance - v_row.due_amount),
      updated_at = now()
    where user_id = v_row.partner_id;

    update public.partner_commission_ledger l
    set released_to_balance_at = now()
    where l.partner_id = v_row.partner_id
      and l.kind = 'cpa'
      and l.released_to_balance_at is null
      and l.withdrawable_at is not null
      and l.withdrawable_at <= now();

    v_total_released := v_total_released + v_row.due_amount;
    v_partners := v_partners + 1;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'partners', v_partners,
    'released_total', v_total_released
  );
end;
$$;

revoke execute on function public.partner_release_mature_cpa(uuid) from public;
grant execute on function public.partner_release_mature_cpa(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Payment identity + heuristics
-- ---------------------------------------------------------------------------
create or replace function public.evaluate_cpa_fraud_heuristics(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partner_id uuid;
  v_referral_created timestamptz;
  v_ur public.user_referrals%rowtype;
  v_identity public.user_payment_identities%rowtype;
  v_reasons text[] := '{}';
  v_score int := 55;
  v_dup_user uuid;
  v_minutes_to_qualify numeric;
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'skipped', true);
  end if;

  if exists (
    select 1 from public.cpa_fraud_flags f
    where f.user_id = p_user_id and f.status in ('confirmed', 'cleared', 'resolved')
  ) then
    return jsonb_build_object('ok', true, 'skipped', true, 'reason', 'terminal_flag');
  end if;

  select * into v_ur from public.user_referrals where user_id = p_user_id;
  if not found then
    return jsonb_build_object('ok', true, 'skipped', true, 'reason', 'not_referred');
  end if;

  v_partner_id := v_ur.partner_id;
  v_referral_created := v_ur.created_at;

  select * into v_identity from public.user_payment_identities where user_id = p_user_id;

  if v_identity.cpf_hash is not null then
    select upi.user_id into v_dup_user
    from public.user_payment_identities upi
    where upi.cpf_hash = v_identity.cpf_hash
      and upi.user_id <> p_user_id
    limit 1;

    if v_dup_user is not null then
      v_reasons := array_append(v_reasons, 'duplicate_cpf');
      v_score := greatest(v_score, 85);
    end if;
  end if;

  if v_ur.qualified_deposit_total >= public.partner_setting_num('cpa_min_deposit_threshold', 50)
     and v_ur.cpa_paid_at is not null
     and v_referral_created is not null then
    v_minutes_to_qualify :=
      extract(epoch from (v_ur.cpa_paid_at - v_referral_created)) / 60.0;
    if v_minutes_to_qualify < 20 then
      v_reasons := array_append(v_reasons, 'fast_cpa_qualification');
      v_score := greatest(v_score, 70);
    end if;
  end if;

  if coalesce(array_length(v_reasons, 1), 0) = 0 then
    return jsonb_build_object('ok', true, 'flagged', false);
  end if;

  insert into public.cpa_fraud_flags (
    user_id, partner_id, status, risk_score, reasons, notes, updated_at
  )
  values (
    p_user_id,
    v_partner_id,
    'open',
    v_score,
    to_jsonb(v_reasons),
    'auto_heuristic',
    now()
  )
  on conflict (user_id) do update
  set
    partner_id = coalesce(excluded.partner_id, cpa_fraud_flags.partner_id),
    status = case
      when cpa_fraud_flags.status = 'confirmed' then cpa_fraud_flags.status
      else 'open'
    end,
    risk_score = greatest(cpa_fraud_flags.risk_score, excluded.risk_score),
    reasons = (
      select jsonb_agg(distinct elem)
      from jsonb_array_elements(
        coalesce(cpa_fraud_flags.reasons, '[]'::jsonb) || to_jsonb(v_reasons)
      ) elem
    ),
    notes = coalesce(cpa_fraud_flags.notes, excluded.notes),
    updated_at = now()
  where cpa_fraud_flags.status not in ('confirmed', 'cleared', 'resolved');

  return jsonb_build_object(
    'ok', true,
    'flagged', true,
    'reasons', to_jsonb(v_reasons),
    'risk_score', v_score
  );
end;
$$;

revoke execute on function public.evaluate_cpa_fraud_heuristics(uuid) from public;
grant execute on function public.evaluate_cpa_fraud_heuristics(uuid) to service_role;

create or replace function public.service_upsert_payment_identity(
  p_user_id uuid,
  p_document text,
  p_source text default 'syncpay_webhook'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_digits text := public.normalize_cpf_digits(p_document);
  v_hash text := public.hash_cpf_document(p_document);
  v_last4 text;
  v_invalid boolean := false;
begin
  if p_user_id is null or v_digits is null then
    return;
  end if;

  v_invalid := not public.is_valid_cpf(v_digits);
  v_last4 := right(v_digits, 4);

  insert into public.user_payment_identities (
    user_id, cpf_hash, cpf_last4, document_source, first_seen_at, last_seen_at, updated_at
  )
  values (
    p_user_id, v_hash, v_last4, coalesce(p_source, 'syncpay_webhook'), now(), now(), now()
  )
  on conflict (user_id) do update
  set
    cpf_hash = coalesce(excluded.cpf_hash, user_payment_identities.cpf_hash),
    cpf_last4 = coalesce(excluded.cpf_last4, user_payment_identities.cpf_last4),
    document_source = excluded.document_source,
    last_seen_at = now(),
    updated_at = now();

  if v_invalid then
    insert into public.cpa_fraud_flags (user_id, partner_id, status, risk_score, reasons, notes, updated_at)
    select
      p_user_id,
      ur.partner_id,
      'open',
      75,
      '["invalid_cpf"]'::jsonb,
      'auto_heuristic',
      now()
    from public.user_referrals ur
    where ur.user_id = p_user_id
    on conflict (user_id) do update
    set
      risk_score = greatest(cpa_fraud_flags.risk_score, 75),
      reasons = (
        select jsonb_agg(distinct elem)
        from jsonb_array_elements(
          coalesce(cpa_fraud_flags.reasons, '[]'::jsonb) || '["invalid_cpf"]'::jsonb
        ) elem
      ),
      updated_at = now()
    where cpa_fraud_flags.status not in ('confirmed', 'cleared', 'resolved');
  else
    perform public.evaluate_cpa_fraud_heuristics(p_user_id);
  end if;
end;
$$;

revoke execute on function public.service_upsert_payment_identity(uuid, text, text) from public;
grant execute on function public.service_upsert_payment_identity(uuid, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- CPA accrual: pending until day 8 of next month
-- ---------------------------------------------------------------------------
create or replace function public.maybe_pay_partner_cpa(
  p_user_id uuid,
  p_amount numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ur public.user_referrals%rowtype;
  v_partner public.partner_accounts%rowtype;
  v_threshold numeric;
  v_cpa numeric;
  v_was_first boolean;
  v_release_at timestamptz;
begin
  if not public.is_partner_program_enabled() then return; end if;
  if p_user_id is null or p_amount is null or p_amount <= 0 then return; end if;

  select * into v_ur
  from public.user_referrals
  where user_id = p_user_id
  for update;

  if not found or v_ur.cpa_paid_at is not null then return; end if;

  v_was_first := v_ur.first_deposit_at is null;

  update public.user_referrals
  set
    qualified_deposit_total = qualified_deposit_total + p_amount,
    first_deposit_at = coalesce(first_deposit_at, now())
  where user_id = p_user_id
  returning * into v_ur;

  if v_was_first then
    perform public.emit_partner_event(
      v_ur.partner_id, 'deposit',
      'Indicado depositou R$ ' || p_amount::text,
      jsonb_build_object('user_id', p_user_id, 'amount', p_amount)
    );
  end if;

  v_threshold := public.partner_setting_num('cpa_min_deposit_threshold', 50);
  if v_ur.qualified_deposit_total < v_threshold then return; end if;

  select * into v_partner
  from public.partner_accounts
  where user_id = v_ur.partner_id and status = 'active'
  for update;

  v_cpa := coalesce(
    case when found then v_partner.cpa_amount end,
    public.partner_setting_num('default_cpa_amount', 0)
  );

  v_release_at := public.partner_cpa_withdrawable_at(now());

  if found and v_cpa > 0 then
    insert into public.partner_commission_ledger (
      partner_id, amount, rake_base, referred_volume, kind, meta, withdrawable_at
    )
    values (
      v_ur.partner_id, v_cpa, 0, v_ur.qualified_deposit_total, 'cpa',
      jsonb_build_object(
        'referred_user_id', p_user_id,
        'deposit_total', v_ur.qualified_deposit_total,
        'accrual', 'pending_until_day_8'
      ),
      v_release_at
    );

    update public.partner_accounts
    set
      pending_balance = pending_balance + v_cpa,
      updated_at = now()
    where user_id = v_ur.partner_id;

    perform public.emit_partner_event(
      v_ur.partner_id, 'cpa',
      'CPA de R$ ' || v_cpa::text || ' provisionado — liberável em ' || to_char(v_release_at at time zone 'America/Sao_Paulo', 'DD/MM/YYYY'),
      jsonb_build_object(
        'user_id', p_user_id,
        'amount', v_cpa,
        'deposit_total', v_ur.qualified_deposit_total,
        'withdrawable_at', v_release_at
      )
    );
  end if;

  update public.user_referrals
  set cpa_paid_at = now()
  where user_id = p_user_id and cpa_paid_at is null;

  perform public.evaluate_cpa_fraud_heuristics(p_user_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- SyncPay webhook: capture payer document
-- ---------------------------------------------------------------------------
create or replace function public.service_process_syncpay_webhook(
  p_provider_id text,
  p_event text,
  p_payload jsonb,
  p_signature text default null,
  p_provider_event_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_intent public.payment_intents%rowtype;
  v_event_id uuid;
  v_note text := null;
  v_new_status text := null;
  v_action text := 'ignored';
  v_dedupe_key text := coalesce(nullif(trim(p_provider_event_id), ''), md5(coalesce(p_payload::text, '')));
  v_payer_doc text;
begin
  if p_provider_id is null or length(trim(p_provider_id)) = 0 then
    raise exception 'provider_id required';
  end if;
  if p_event is null or length(trim(p_event)) = 0 then
    raise exception 'event required';
  end if;

  select *
    into v_intent
    from public.payment_intents
   where provider_id = p_provider_id
   for update;

  insert into public.syncpay_webhook_events (
    provider_id,
    provider_event_id,
    event,
    dedupe_key,
    signature,
    payload,
    intent_id
  )
  values (
    p_provider_id,
    p_provider_event_id,
    p_event,
    v_dedupe_key,
    p_signature,
    p_payload,
    v_intent.id
  )
  on conflict (dedupe_key) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    return jsonb_build_object('ok', true, 'already_processed', true, 'action', 'deduped');
  end if;

  if v_intent.id is null then
    update public.syncpay_webhook_events
       set processing_status = 'ignored',
           processing_note = 'unknown_provider_id',
           processed_at = now()
     where id = v_event_id;
    return jsonb_build_object('ok', true, 'ignored', true, 'reason', 'unknown_provider_id');
  end if;

  if v_intent.status <> 'pending' then
    update public.syncpay_webhook_events
       set processing_status = 'ignored',
           processing_note = 'intent_not_pending',
           processed_at = now()
     where id = v_event_id;
    return jsonb_build_object('ok', true, 'already_processed', true, 'action', 'intent_not_pending');
  end if;

  v_payer_doc := public.syncpay_extract_payer_document(p_payload);

  if p_event = 'PAYMENT_RECEIVED' and v_intent.type = 'deposit' then
    if v_payer_doc is not null then
      perform public.service_upsert_payment_identity(
        v_intent.user_id,
        v_payer_doc,
        'syncpay_cashin'
      );
    end if;
    perform public.service_credit_balance(v_intent.user_id, v_intent.amount, v_intent.id);
    v_new_status := 'paid';
    v_action := 'credited';
  elsif p_event = 'PAYOUT_COMPLETED' and v_intent.type = 'withdraw' then
    v_new_status := 'paid';
    v_action := 'withdraw_paid';
  elsif p_event in ('PAYMENT_FAILED', 'PAYOUT_FAILED') then
    v_new_status := 'failed';
    if v_intent.type = 'withdraw' then
      v_action := 'withdraw_refunded';
    else
      v_action := 'deposit_failed';
    end if;
  elsif p_event = 'PAYMENT_EXPIRED' then
    v_new_status := 'expired';
    v_action := 'deposit_expired';
  else
    v_note := 'event_ignored';
  end if;

  if v_new_status is not null then
    update public.payment_intents
       set status = v_new_status,
           settled_at = case when v_new_status = 'paid' then now() else settled_at end,
           provider_payload = coalesce(provider_payload, '{}'::jsonb) || p_payload,
           meta = coalesce(meta, '{}'::jsonb) || jsonb_build_object(
             'last_webhook_event', p_event,
             'payer_document_last4', case
               when v_payer_doc is not null then right(public.normalize_cpf_digits(v_payer_doc), 4)
               else null
             end
           ),
           updated_at = now()
     where id = v_intent.id;
  end if;

  update public.syncpay_webhook_events
     set processing_status = case when v_new_status is null then 'ignored' else 'processed' end,
         processing_note = coalesce(v_note, v_action),
         processed_at = now()
   where id = v_event_id;

  return jsonb_build_object(
    'ok', true,
    'action', coalesce(v_action, 'ignored'),
    'status', coalesce(v_new_status, v_intent.status),
    'intent_id', v_intent.id,
    'payer_document_captured', v_payer_doc is not null
  );
exception when others then
  if v_event_id is not null then
    update public.syncpay_webhook_events
       set processing_status = 'error',
           processing_note = sqlerrm,
           processed_at = now()
     where id = v_event_id;
  end if;
  raise;
end;
$$;

-- ---------------------------------------------------------------------------
-- Financial guards (place_bet: account active check only)
-- ---------------------------------------------------------------------------
create or replace function public.place_bet(
  p_market_id text,
  p_side      bet_side,
  p_stake     numeric,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id      uuid := auth.uid();
  v_market       markets%rowtype;
  v_profile      profiles%rowtype;
  v_new_pool_yes numeric;
  v_new_pool_no  numeric;
  v_share        numeric;
  v_bet_id       uuid;
  v_tx_id        uuid;
  v_recent_bets  int;
  v_label        text;
  v_key          text := nullif(trim(coalesce(p_idempotency_key, '')), '');
  v_existing     public.bets%rowtype;
  v_balance      numeric;
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  perform public.assert_user_account_active(v_user_id);

  if p_stake <= 0 then
    raise exception 'Stake must be positive';
  end if;
  if p_stake > 100000 then
    raise exception 'Stake cannot exceed 100.000 BRL';
  end if;

  if v_key is not null then
    select * into v_existing
    from public.bets
    where user_id = v_user_id and idempotency_key = v_key;

    if found then
      if v_existing.market_id is distinct from p_market_id
        or v_existing.side is distinct from p_side
        or v_existing.stake is distinct from p_stake then
        raise exception 'idempotency_key_conflict';
      end if;

      select pool_yes, pool_no into v_new_pool_yes, v_new_pool_no
      from public.markets where id = v_existing.market_id;

      select balance into v_balance from public.profiles where id = v_user_id;

      select id into v_tx_id
      from public.transactions
      where user_id = v_user_id
        and market_id = v_existing.market_id
        and type = 'entry'
        and amount = v_existing.stake
      order by created_at desc
      limit 1;

      return jsonb_build_object(
        'bet_id',   v_existing.id,
        'tx_id',    v_tx_id,
        'pool_yes', v_new_pool_yes,
        'pool_no',  v_new_pool_no,
        'balance',  v_balance,
        'idempotent', true
      );
    end if;
  end if;

  select count(*) into v_recent_bets
  from public.bets
  where user_id = v_user_id
    and created_at > now() - interval '60 seconds';

  if v_recent_bets >= 10 then
    raise exception 'rate_limit_exceeded: maximum 10 bets per minute';
  end if;

  select * into v_profile
  from public.profiles
  where id = v_user_id
  for update;

  if not found then
    raise exception 'Profile not found';
  end if;

  if v_profile.balance < p_stake then
    raise exception 'Insufficient balance';
  end if;

  select * into v_market
  from public.markets
  where id = p_market_id
  for update;

  if not found then
    raise exception 'Market not found';
  end if;

  if coalesce(v_market.market_kind, 'platform') = 'community' then
    if not public.is_user_registered(v_user_id) then
      raise exception 'registration_required';
    end if;
    if v_market.created_by = v_user_id then
      raise exception 'creator_cannot_bet';
    end if;
    if v_market.visibility = 'unlisted' then
      if not exists (
        select 1 from public.market_access ma
        where ma.market_id = p_market_id and ma.user_id = v_user_id
      ) then
        raise exception 'market_access_denied';
      end if;
    end if;
  end if;

  if v_market.frozen then
    raise exception 'Market is frozen';
  end if;

  if v_market.status not in ('live', 'closing') then
    raise exception 'Market % does not accept bets (status=%)', p_market_id, v_market.status;
  end if;

  if not v_market.accept_bets then
    raise exception 'Market closed for entries';
  end if;

  if v_market.ends_at is not null and v_market.ends_at < now() then
    raise exception 'Market % deadline has passed (ended %)', p_market_id, v_market.ends_at;
  end if;

  if p_side = 'YES' then
    v_new_pool_yes := v_market.pool_yes + p_stake;
    v_new_pool_no  := v_market.pool_no;
    v_share        := p_stake / v_new_pool_yes;
  else
    v_new_pool_yes := v_market.pool_yes;
    v_new_pool_no  := v_market.pool_no + p_stake;
    v_share        := p_stake / v_new_pool_no;
  end if;

  v_label := case
    when v_market.market_kind = 'community' then left(v_market.question, 80)
    else v_market.region
  end;

  update public.profiles
  set balance    = balance - p_stake,
      volume_24h = volume_24h + p_stake
  where id = v_user_id;

  update public.markets
  set pool_yes     = v_new_pool_yes,
      pool_no      = v_new_pool_no,
      participants = participants + 1
  where id = p_market_id;

  begin
    insert into public.bets (user_id, market_id, side, stake, share, idempotency_key)
    values (v_user_id, p_market_id, p_side, p_stake, v_share, v_key)
    returning id into v_bet_id;
  exception
    when unique_violation then
      if v_key is null then
        raise;
      end if;
      select * into v_existing
      from public.bets
      where user_id = v_user_id and idempotency_key = v_key;
      if not found then
        raise;
      end if;
      return jsonb_build_object(
        'bet_id',   v_existing.id,
        'tx_id',    null,
        'pool_yes', v_new_pool_yes,
        'pool_no',  v_new_pool_no,
        'balance',  v_profile.balance - p_stake,
        'idempotent', true
      );
  end;

  insert into public.transactions (
    user_id, type, market_id, market_label, amount,
    before_balance, after_balance
  )
  values (
    v_user_id, 'entry', p_market_id, v_label, p_stake,
    v_profile.balance,
    v_profile.balance - p_stake
  )
  returning id into v_tx_id;

  return jsonb_build_object(
    'bet_id',   v_bet_id,
    'tx_id',    v_tx_id,
    'pool_yes', v_new_pool_yes,
    'pool_no',  v_new_pool_no,
    'balance',  v_profile.balance - p_stake
  );
end;
$$;

create or replace function public.request_withdrawal(
  p_amount  numeric,
  p_pix_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_profile profiles%rowtype;
  v_intent  uuid;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;

  perform public.assert_user_account_active(v_uid);

  if not public.is_user_registered(v_uid) then
    raise exception 'registration_required';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;
  if p_pix_key is null or length(trim(p_pix_key)) = 0 then
    raise exception 'Pix key is required';
  end if;

  select * into v_profile from public.profiles where id = v_uid for update;
  if not found then raise exception 'Profile not found'; end if;

  if p_amount > 100 and v_profile.kyc_status != 'approved' then
    raise exception 'kyc_required: complete identity verification to withdraw above 100 BRL';
  end if;

  if v_profile.balance < p_amount then raise exception 'Insufficient balance'; end if;

  update public.profiles
  set balance = balance - p_amount
  where id = v_uid;

  insert into public.payment_intents (user_id, type, amount, pix_key, status)
  values (v_uid, 'withdraw', p_amount, p_pix_key, 'pending')
  returning id into v_intent;

  insert into public.transactions (
    user_id, type, amount, market_label,
    before_balance, after_balance
  )
  values (
    v_uid, 'withdraw', p_amount, 'Saque Pix',
    v_profile.balance,
    v_profile.balance - p_amount
  );

  return jsonb_build_object('intent_id', v_intent, 'balance', v_profile.balance - p_amount);
end;
$$;

-- ---------------------------------------------------------------------------
-- Partner payout + overview (release mature CPA first)
-- ---------------------------------------------------------------------------
create or replace function public.partner_request_payout(p_amount numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_bal numeric;
  v_min numeric;
  v_real boolean;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  perform public.partner_release_mature_cpa(v_uid);

  v_min := public.partner_setting_num('min_payout_amount', 50);
  if p_amount < v_min then raise exception 'Minimum payout is %', v_min; end if;

  select coalesce(
    (select (value #>> '{}')::boolean from public.platform_settings where key = 'partner_payouts_real'),
    false
  ) into v_real;

  select balance into v_bal from public.partner_accounts where user_id = v_uid and status = 'active' for update;
  if not found then raise exception 'Not active partner'; end if;
  if v_bal < p_amount then raise exception 'Insufficient balance'; end if;

  update public.partner_accounts set balance = balance - p_amount where user_id = v_uid;
  insert into public.partner_payouts (partner_id, amount, status, method)
  values (
    v_uid,
    p_amount,
    case when v_real then 'pending' else 'simulated' end,
    case when v_real then 'pix' else 'simulated' end
  );

  return jsonb_build_object(
    'ok', true,
    'balance', v_bal - p_amount,
    'simulated', not v_real
  );
end;
$$;

create or replace function public.get_partner_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_pa public.partner_accounts%rowtype;
  v_is_admin boolean;
  v_handle text;
  v_referrals int;
  v_volume numeric;
  v_revenue numeric;
  v_clicks int;
  v_conversions int;
  v_cpa_pending numeric;
  v_next_release timestamptz;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;

  perform public.partner_release_mature_cpa(v_uid);

  select * into v_pa from public.partner_accounts where user_id = v_uid and status = 'active';

  if not found then
    select coalesce(p.is_admin, false), coalesce(p.handle, '')
    into v_is_admin, v_handle
    from public.profiles p
    where p.id = v_uid;

    if v_is_admin then
      return jsonb_build_object(
        'balance', 0,
        'pending_balance', 0,
        'cpa_pending', 0,
        'cpa_next_release_at', null,
        'tier', 'Admin (preview)',
        'slug', v_handle,
        'referrals', 0,
        'volume', 0,
        'revenue', 0,
        'clicks', 0,
        'conversions', 0,
        'conversion_rate', 0,
        'revenue_share_pct', public.partner_setting_num('default_revenue_share_pct', 0.20),
        'cpa_amount', public.partner_setting_num('default_cpa_amount', 0),
        'cpa_uses_custom', false,
        'cpa_min_deposit_threshold', public.partner_setting_num('cpa_min_deposit_threshold', 50),
        'admin_preview', true
      );
    end if;

    raise exception 'Not an active partner';
  end if;

  select coalesce(sum(l.amount), 0), min(l.withdrawable_at)
  into v_cpa_pending, v_next_release
  from public.partner_commission_ledger l
  where l.partner_id = v_uid
    and l.kind = 'cpa'
    and l.released_to_balance_at is null;

  select count(*) into v_referrals from public.user_referrals where partner_id = v_uid;
  select coalesce(sum(b.stake), 0) into v_volume
  from public.bets b
  join public.user_referrals ur on ur.user_id = b.user_id
  where ur.partner_id = v_uid;
  select coalesce(sum(amount), 0) into v_revenue
  from public.partner_commission_ledger where partner_id = v_uid;
  select coalesce(sum(clicks), 0), coalesce(sum(conversions), 0)
  into v_clicks, v_conversions
  from public.partner_campaigns where partner_id = v_uid;

  return jsonb_build_object(
    'balance', v_pa.balance,
    'pending_balance', v_pa.pending_balance,
    'cpa_pending', v_cpa_pending,
    'cpa_next_release_at', v_next_release,
    'tier', v_pa.tier,
    'slug', v_pa.slug,
    'referrals', v_referrals,
    'volume', v_volume,
    'revenue', v_revenue,
    'clicks', v_clicks,
    'conversions', v_conversions,
    'conversion_rate', case when v_clicks > 0 then round((v_conversions::numeric / v_clicks) * 100, 1) else 0 end,
    'revenue_share_pct', v_pa.revenue_share_pct,
    'cpa_amount', coalesce(v_pa.cpa_amount, public.partner_setting_num('default_cpa_amount', 0)),
    'cpa_uses_custom', v_pa.cpa_amount is not null,
    'cpa_min_deposit_threshold', public.partner_setting_num('cpa_min_deposit_threshold', 50),
    'admin_preview', false
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin: soft-ban instead of hard delete; CPA reversal respects pending vs released
-- ---------------------------------------------------------------------------
create or replace function public.admin_clear_cpa_fraud_cases(
  p_action_note text,
  p_only_confirmed boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_ledger record;
  v_rev record;
  v_reversed_count int := 0;
  v_reversed_total numeric := 0;
  v_note text := trim(coalesce(p_action_note, ''));
  v_released_amt numeric;
  v_pending_amt numeric;
  v_revenue_amt numeric;
begin
  perform public.assert_admin();
  perform public.assert_admin_action_note(v_note);

  if not coalesce(p_only_confirmed, true) then
    raise exception 'only_confirmed_required: ações destrutivas exigem status confirmed';
  end if;

  for v_row in
    select f.user_id, ur.partner_id
    from public.cpa_fraud_flags f
    join public.user_referrals ur on ur.user_id = f.user_id
    where f.status = 'confirmed'
      and ur.cpa_paid_at is not null
  loop
    v_released_amt := 0;
    v_pending_amt := 0;
    v_revenue_amt := 0;

    for v_ledger in
      select l.id, l.amount, l.released_to_balance_at
      from public.partner_commission_ledger l
      where l.partner_id = v_row.partner_id
        and l.kind = 'cpa'
        and l.meta ->> 'referred_user_id' = v_row.user_id::text
    loop
      if v_ledger.released_to_balance_at is not null then
        v_released_amt := v_released_amt + v_ledger.amount;
      else
        v_pending_amt := v_pending_amt + v_ledger.amount;
      end if;
    end loop;

    if v_released_amt + v_pending_amt <= 0 then
      continue;
    end if;

    insert into public.partner_commission_ledger (
      partner_id, amount, rake_base, referred_volume, kind, meta
    )
    values (
      v_row.partner_id,
      -abs(v_released_amt + v_pending_amt),
      0,
      0,
      'cpa_reversal',
      jsonb_build_object(
        'referred_user_id', v_row.user_id,
        'source', 'admin_clear_cpa_fraud_cases',
        'cleared_by', auth.uid(),
        'action_note', v_note,
        'released_reversed', v_released_amt,
        'pending_reversed', v_pending_amt
      )
    );

    update public.partner_accounts
    set
      balance = greatest(0, coalesce(balance, 0) - abs(v_released_amt)),
      pending_balance = greatest(0, coalesce(pending_balance, 0) - abs(v_pending_amt)),
      updated_at = now()
    where user_id = v_row.partner_id;

    -- Também reverte comissão por porcentagem gerada pelo usuário fraudado
    -- para creators do revenue_share e sub_override.
    for v_rev in
      with user_markets as (
        select b.market_id, coalesce(sum(b.stake), 0)::numeric as user_stake
        from public.bets b
        where b.user_id = v_row.user_id
        group by b.market_id
      )
      select
        l.partner_id,
        l.kind,
        sum(
          l.amount * least(1, greatest(0, um.user_stake / nullif(l.referred_volume, 0)))
        )::numeric as reverse_amount
      from user_markets um
      join public.partner_commission_ledger l
        on l.market_id = um.market_id
       and l.kind in ('revenue_share', 'sub_override')
       and l.amount > 0
       and coalesce(l.referred_volume, 0) > 0
      group by l.partner_id, l.kind
      having sum(
        l.amount * least(1, greatest(0, um.user_stake / nullif(l.referred_volume, 0)))
      ) > 0
    loop
      insert into public.partner_commission_ledger (
        partner_id, amount, rake_base, referred_volume, kind, meta
      )
      values (
        v_rev.partner_id,
        -abs(v_rev.reverse_amount),
        0,
        0,
        'fraud_reversal',
        jsonb_build_object(
          'referred_user_id', v_row.user_id,
          'source', 'admin_clear_cpa_fraud_cases',
          'cleared_by', auth.uid(),
          'action_note', v_note,
          'original_kind', v_rev.kind
        )
      );

      update public.partner_accounts
      set
        balance = greatest(0, coalesce(balance, 0) - abs(v_rev.reverse_amount)),
        updated_at = now()
      where user_id = v_rev.partner_id;

      v_revenue_amt := v_revenue_amt + abs(v_rev.reverse_amount);
    end loop;

    update public.cpa_fraud_flags
    set status = 'resolved',
        is_cpa_counted = false,
        reviewed_at = now(),
        reviewed_by = auth.uid(),
        notes = trim(
          both ' '
          from coalesce(notes, '') || ' [Reversão antifraude (CPA+%): ' || v_note || ']'
        ),
        updated_at = now()
    where user_id = v_row.user_id;

    v_reversed_count := v_reversed_count + 1;
    v_reversed_total := v_reversed_total + abs(v_released_amt + v_pending_amt) + v_revenue_amt;
  end loop;

  insert into public.admin_actions (admin_id, action, target_type, payload)
  values (
    auth.uid(),
    'clear_cpa_fraud_cases',
    'partner_commission_ledger',
    jsonb_build_object(
      'only_confirmed', true,
      'action_note', v_note,
      'cases', v_reversed_count,
      'total', v_reversed_total
    )
  );

  return jsonb_build_object(
    'ok', true,
    'reversed_cases', v_reversed_count,
    'reversed_total', v_reversed_total
  );
end;
$$;

create or replace function public.admin_ban_cpa_fraud_users(
  p_action_note text,
  p_only_confirmed boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
  v_count int := 0;
  v_note text := trim(coalesce(p_action_note, ''));
begin
  perform public.assert_admin();
  perform public.assert_admin_action_note(v_note);

  if not coalesce(p_only_confirmed, true) then
    raise exception 'only_confirmed_required: banimento exige status confirmed';
  end if;

  select coalesce(array_agg(f.user_id), '{}'::uuid[])
    into v_ids
  from public.cpa_fraud_flags f
  where f.status = 'confirmed';

  if coalesce(array_length(v_ids, 1), 0) = 0 then
    return jsonb_build_object('ok', true, 'banned_users', 0, 'user_ids', '[]'::jsonb);
  end if;

  update public.profiles p
  set
    banned_at = coalesce(p.banned_at, now()),
    ban_reason = v_note,
    deleted_at = coalesce(p.deleted_at, now())
  where p.id = any(v_ids)
    and p.banned_at is null;

  get diagnostics v_count = row_count;

  insert into public.user_risk_profiles (user_id, frozen, notes, updated_at)
  select uid, true, 'cpa_fraud_ban: ' || v_note, now()
  from unnest(v_ids) as uid
  on conflict (user_id) do update
  set frozen = true,
      notes = coalesce(user_risk_profiles.notes, '') || ' | cpa_fraud_ban: ' || v_note,
      updated_at = now();

  update public.cpa_fraud_flags f
  set status = 'resolved',
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      notes = trim(both ' ' from coalesce(f.notes, '') || ' [ban: ' || v_note || ']'),
      updated_at = now()
  where f.user_id = any(v_ids);

  insert into public.admin_actions (admin_id, action, target_type, payload)
  values (
    auth.uid(),
    'ban_cpa_fraud_users',
    'profiles',
    jsonb_build_object(
      'banned', v_count,
      'only_confirmed', true,
      'action_note', v_note,
      'user_ids', to_jsonb(v_ids)
    )
  );

  return jsonb_build_object('ok', true, 'banned_users', v_count, 'user_ids', to_jsonb(v_ids));
end;
$$;

create or replace function public.admin_delete_cpa_fraud_users(
  p_action_note text,
  p_only_confirmed boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();
  return public.admin_ban_cpa_fraud_users(p_action_note, p_only_confirmed);
end;
$$;

-- Enrich admin referral list with CPF signals
create or replace function public.admin_list_cpa_referrals(
  p_only_flagged boolean default false,
  p_limit int default 200
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'user_id', x.user_id,
          'user_handle', x.user_handle,
          'user_name', x.user_name,
          'partner_id', x.partner_id,
          'partner_handle', x.partner_handle,
          'partner_slug', x.partner_slug,
          'qualified_deposit_total', x.qualified_deposit_total,
          'cpa_paid_at', x.cpa_paid_at,
          'referred_at', x.referred_at,
          'flagged', x.flagged,
          'flag_status', x.flag_status,
          'flag_risk_score', x.flag_risk_score,
          'flag_reasons', x.flag_reasons,
          'cpf_last4', x.cpf_last4,
          'cpf_duplicate', x.cpf_duplicate
        )
        order by x.referred_at desc
      )
      from (
      select
        ur.user_id,
        pu.handle as user_handle,
        pu.name as user_name,
        ur.partner_id,
        pp.handle as partner_handle,
        pa.slug as partner_slug,
        coalesce(ur.qualified_deposit_total, 0)::numeric as qualified_deposit_total,
        ur.cpa_paid_at,
        ur.created_at as referred_at,
        (f.id is not null) as flagged,
        f.status as flag_status,
        f.risk_score as flag_risk_score,
        f.reasons as flag_reasons,
        upi.cpf_last4,
        exists (
          select 1
          from public.user_payment_identities o
          where o.cpf_hash = upi.cpf_hash
            and o.user_id <> ur.user_id
            and upi.cpf_hash is not null
        ) as cpf_duplicate
      from public.user_referrals ur
      join public.profiles pu on pu.id = ur.user_id
      join public.partner_accounts pa on pa.user_id = ur.partner_id
      join public.profiles pp on pp.id = pa.user_id
      left join public.cpa_fraud_flags f on f.user_id = ur.user_id
      left join public.user_payment_identities upi on upi.user_id = ur.user_id
      where not coalesce(p_only_flagged, false) or f.id is not null
      order by ur.created_at desc
      limit greatest(1, least(coalesce(p_limit, 200), 500))
      ) x
    ),
    '[]'::jsonb
  );
end;
$$;

grant execute on function public.admin_ban_cpa_fraud_users(text, boolean) to authenticated;
grant execute on function public.normalize_cpf_digits(text) to authenticated, service_role;
grant execute on function public.is_valid_cpf(text) to authenticated, service_role;
grant execute on function public.hash_cpf_document(text) to service_role;
