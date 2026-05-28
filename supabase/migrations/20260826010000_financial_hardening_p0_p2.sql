-- Financial hardening:
-- - place_bet idempotency lock + mandatory key
-- - webhook dedupe strictly by provider_event_id
-- - distributed rate limiting via Postgres

create table if not exists public.request_rate_limits (
  rate_key text not null,
  window_start timestamptz not null,
  hits integer not null default 1,
  updated_at timestamptz not null default now(),
  primary key (rate_key, window_start)
);

create index if not exists request_rate_limits_window_start_idx
  on public.request_rate_limits(window_start);

alter table public.request_rate_limits enable row level security;

drop policy if exists request_rate_limits_deny_all on public.request_rate_limits;
create policy request_rate_limits_deny_all
  on public.request_rate_limits
  for all
  to authenticated
  using (false)
  with check (false);

create or replace function public.service_assert_rate_limit(
  p_key text,
  p_max integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_window_start timestamptz;
  v_hits integer;
  v_limited boolean;
begin
  if p_key is null or length(trim(p_key)) = 0 then
    raise exception 'rate limit key is required';
  end if;
  if p_max is null or p_max <= 0 then
    raise exception 'rate limit max must be > 0';
  end if;
  if p_window_seconds is null or p_window_seconds <= 0 then
    raise exception 'rate limit window must be > 0';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds
  );

  insert into public.request_rate_limits (rate_key, window_start, hits, updated_at)
  values (p_key, v_window_start, 1, v_now)
  on conflict (rate_key, window_start)
  do update set
    hits = public.request_rate_limits.hits + 1,
    updated_at = v_now
  returning hits into v_hits;

  v_limited := v_hits > p_max;

  if random() < 0.01 then
    delete from public.request_rate_limits
    where window_start < v_now - interval '1 day';
  end if;

  return jsonb_build_object(
    'limited', v_limited,
    'hits', v_hits,
    'max', p_max,
    'retry_after_seconds', p_window_seconds
  );
end;
$$;

revoke execute on function public.service_assert_rate_limit(text, integer, integer) from public;
revoke execute on function public.service_assert_rate_limit(text, integer, integer) from anon;
grant execute on function public.service_assert_rate_limit(text, integer, integer) to service_role;

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

  if v_key is null then
    raise exception 'idempotency_key_required';
  end if;

  perform public.assert_user_account_active(v_user_id);
  perform pg_advisory_xact_lock(hashtext(v_user_id::text || ':' || v_key));

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

  if p_stake <= 0 then
    raise exception 'Stake must be positive';
  end if;
  if p_stake > 100000 then
    raise exception 'Stake cannot exceed 100.000 BRL';
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

  insert into public.bets (user_id, market_id, side, stake, share, idempotency_key)
  values (v_user_id, p_market_id, p_side, p_stake, v_share, v_key)
  returning id into v_bet_id;

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
  v_dedupe_key text;
  v_payer_doc text;
begin
  if p_provider_id is null or length(trim(p_provider_id)) = 0 then
    raise exception 'provider_id required';
  end if;
  if p_event is null or length(trim(p_event)) = 0 then
    raise exception 'event required';
  end if;
  if p_provider_event_id is null or length(trim(p_provider_event_id)) = 0 then
    raise exception 'provider_event_id required';
  end if;

  v_dedupe_key := trim(p_provider_event_id);

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
