-- Payer document events: append-only history for Pix cash-in payer CPF/CNPJ clusters.
-- Enables admin antifraud to show how many accounts share the same paying document.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.payer_document_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  payment_intent_id uuid references public.payment_intents(id) on delete set null,
  cpf_hash text not null,
  document_last4 text,
  document_length smallint,
  source text not null default 'syncpay_cashin',
  webhook_event_id uuid references public.syncpay_webhook_events(id) on delete set null,
  seen_at timestamptz not null default now()
);

create unique index if not exists payer_document_events_intent_uniq
  on public.payer_document_events(payment_intent_id)
  where payment_intent_id is not null;

create index if not exists payer_document_events_hash_user_idx
  on public.payer_document_events(cpf_hash, user_id);

create index if not exists payer_document_events_hash_seen_idx
  on public.payer_document_events(cpf_hash, seen_at desc);

alter table public.payer_document_events enable row level security;

drop policy if exists payer_document_events_deny_all on public.payer_document_events;
create policy payer_document_events_deny_all
  on public.payer_document_events
  for all
  to authenticated
  using (false)
  with check (false);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.resolve_user_payer_cpf_hash(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select upi.cpf_hash from public.user_payment_identities upi where upi.user_id = p_user_id),
    (
      select e.cpf_hash
      from public.payer_document_events e
      where e.user_id = p_user_id
      order by e.seen_at desc
      limit 1
    )
  );
$$;

revoke execute on function public.resolve_user_payer_cpf_hash(uuid) from public;
grant execute on function public.resolve_user_payer_cpf_hash(uuid) to service_role;

create or replace function public.count_payer_linked_accounts(p_cpf_hash text)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_cpf_hash is null then 0
    else coalesce((
      select count(distinct e.user_id)::int
      from public.payer_document_events e
      where e.cpf_hash = p_cpf_hash
    ), 0)
  end;
$$;

revoke execute on function public.count_payer_linked_accounts(text) from public;
grant execute on function public.count_payer_linked_accounts(text) to service_role;

create or replace function public.service_record_payer_document_event(
  p_user_id uuid,
  p_document text,
  p_intent_id uuid default null,
  p_webhook_event_id uuid default null,
  p_source text default 'syncpay_cashin'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_digits text := public.normalize_cpf_digits(p_document);
  v_hash text;
  v_last4 text;
  v_len smallint;
begin
  if p_user_id is null or v_digits is null then
    return;
  end if;

  v_hash := public.hash_cpf_document(p_document);
  if v_hash is null then
    return;
  end if;

  v_last4 := right(v_digits, 4);
  v_len := length(v_digits)::smallint;

  insert into public.payer_document_events (
    user_id,
    payment_intent_id,
    cpf_hash,
    document_last4,
    document_length,
    source,
    webhook_event_id,
    seen_at
  )
  values (
    p_user_id,
    p_intent_id,
    v_hash,
    v_last4,
    v_len,
    coalesce(nullif(trim(p_source), ''), 'syncpay_cashin'),
    p_webhook_event_id,
    now()
  )
  on conflict (payment_intent_id) where payment_intent_id is not null
  do nothing;
end;
$$;

revoke execute on function public.service_record_payer_document_event(uuid, text, uuid, uuid, text) from public;
grant execute on function public.service_record_payer_document_event(uuid, text, uuid, uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- Heuristics: duplicate_cpf from payer_document_events
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
  v_cpf_hash text;
  v_linked_count int;
  v_reasons text[] := '{}';
  v_score int := 55;
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

  v_cpf_hash := public.resolve_user_payer_cpf_hash(p_user_id);
  v_linked_count := public.count_payer_linked_accounts(v_cpf_hash);

  if v_linked_count > 1 then
    v_reasons := array_append(v_reasons, 'duplicate_cpf');
    v_score := greatest(v_score, 85);
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
    return jsonb_build_object(
      'ok', true,
      'flagged', false,
      'payer_linked_account_count', v_linked_count
    );
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
    'risk_score', v_score,
    'payer_linked_account_count', v_linked_count
  );
end;
$$;

revoke execute on function public.evaluate_cpa_fraud_heuristics(uuid) from public;
grant execute on function public.evaluate_cpa_fraud_heuristics(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Identity upsert: swallow cpf_hash unique violation (second account same payer)
-- ---------------------------------------------------------------------------
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

  begin
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
  exception
    when unique_violation then
      update public.user_payment_identities
      set
        cpf_last4 = coalesce(v_last4, cpf_last4),
        document_source = coalesce(p_source, document_source),
        last_seen_at = now(),
        updated_at = now()
      where user_id = p_user_id;
  end;

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
-- Webhook: record event before credit; best-effort identity upsert
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
  v_dedupe_key text;
  v_payer_doc text;
  v_linked_count int := 0;
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
      perform public.service_record_payer_document_event(
        v_intent.user_id,
        v_payer_doc,
        v_intent.id,
        v_event_id,
        'syncpay_cashin'
      );
      perform public.service_upsert_payment_identity(
        v_intent.user_id,
        v_payer_doc,
        'syncpay_cashin'
      );
      v_linked_count := public.count_payer_linked_accounts(public.hash_cpf_document(v_payer_doc));
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
             end,
             'payer_linked_account_count', case
               when v_payer_doc is not null then v_linked_count
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
    'payer_document_captured', v_payer_doc is not null,
    'payer_linked_account_count', v_linked_count
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

revoke execute on function public.service_process_syncpay_webhook(text, text, jsonb, text, text)
  from anon, authenticated;
grant execute on function public.service_process_syncpay_webhook(text, text, jsonb, text, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- Admin RPCs
-- ---------------------------------------------------------------------------
create or replace function public.admin_payer_document_cluster(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_hash text;
  v_last4 text;
  v_doc_len smallint;
  v_count int;
  v_accounts jsonb;
begin
  perform public.assert_admin();

  if p_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'user_id_required');
  end if;

  v_hash := public.resolve_user_payer_cpf_hash(p_user_id);

  if v_hash is null then
    return jsonb_build_object(
      'ok', true,
      'cpf_hash', null,
      'document_last4', null,
      'document_length', null,
      'linked_account_count', 0,
      'accounts', '[]'::jsonb
    );
  end if;

  select e.document_last4, e.document_length
    into v_last4, v_doc_len
  from public.payer_document_events e
  where e.cpf_hash = v_hash
  order by e.seen_at desc
  limit 1;

  v_last4 := coalesce(
    v_last4,
    (select upi.cpf_last4 from public.user_payment_identities upi where upi.user_id = p_user_id)
  );

  v_count := public.count_payer_linked_accounts(v_hash);

  select coalesce(jsonb_agg(row_to_json(t) order by t.first_seen_at), '[]'::jsonb)
    into v_accounts
  from (
    select
      p.id as user_id,
      p.handle as user_handle,
      p.name as user_name,
      p.created_at,
      p.kyc_status,
      p.balance,
      (p.banned_at is not null) as banned,
      min(e.seen_at) as first_seen_at,
      max(e.seen_at) as last_seen_at
    from public.payer_document_events e
    join public.profiles p on p.id = e.user_id
    where e.cpf_hash = v_hash
    group by p.id, p.handle, p.name, p.created_at, p.kyc_status, p.balance, p.banned_at
    order by min(e.seen_at)
  ) t;

  return jsonb_build_object(
    'ok', true,
    'cpf_hash', v_hash,
    'document_last4', v_last4,
    'document_length', v_doc_len,
    'linked_account_count', v_count,
    'accounts', v_accounts
  );
end;
$$;

revoke execute on function public.admin_payer_document_cluster(uuid) from public;
grant execute on function public.admin_payer_document_cluster(uuid) to authenticated;

create or replace function public.admin_list_payer_document_clusters(
  p_min_accounts int default 2,
  p_limit int default 50
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
          'cpf_hash', c.cpf_hash,
          'document_last4', c.document_last4,
          'document_length', c.document_length,
          'account_count', c.account_count,
          'accounts', c.accounts
        )
        order by c.account_count desc, c.last_seen_at desc
      )
      from (
        select
          e.cpf_hash,
          max(e.document_last4) as document_last4,
          max(e.document_length) as document_length,
          count(distinct e.user_id)::int as account_count,
          max(e.seen_at) as last_seen_at,
          (
            select coalesce(jsonb_agg(row_to_json(a) order by a.first_seen_at), '[]'::jsonb)
            from (
              select
                p.id as user_id,
                p.handle as user_handle,
                p.name as user_name,
                (p.banned_at is not null) as banned,
                min(ev.seen_at) as first_seen_at,
                max(ev.seen_at) as last_seen_at
              from public.payer_document_events ev
              join public.profiles p on p.id = ev.user_id
              where ev.cpf_hash = e.cpf_hash
              group by p.id, p.handle, p.name, p.banned_at
            ) a
          ) as accounts
        from public.payer_document_events e
        group by e.cpf_hash
        having count(distinct e.user_id) >= greatest(2, coalesce(p_min_accounts, 2))
        order by count(distinct e.user_id) desc, max(e.seen_at) desc
        limit greatest(1, least(coalesce(p_limit, 50), 200))
      ) c
    ),
    '[]'::jsonb
  );
end;
$$;

revoke execute on function public.admin_list_payer_document_clusters(int, int) from public;
grant execute on function public.admin_list_payer_document_clusters(int, int) to authenticated;

-- ---------------------------------------------------------------------------
-- Extend CPA admin list RPCs
-- ---------------------------------------------------------------------------
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
          'cpf_duplicate', x.cpf_duplicate,
          'payer_document_last4', x.payer_document_last4,
          'payer_linked_account_count', x.payer_linked_account_count
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
          coalesce(
            upi.cpf_last4,
            (
              select e.document_last4
              from public.payer_document_events e
              where e.user_id = ur.user_id
              order by e.seen_at desc
              limit 1
            )
          ) as payer_document_last4,
          public.count_payer_linked_accounts(public.resolve_user_payer_cpf_hash(ur.user_id))
            as payer_linked_account_count,
          public.count_payer_linked_accounts(public.resolve_user_payer_cpf_hash(ur.user_id)) > 1
            as cpf_duplicate
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

create or replace function public.admin_list_cpa_fraud_cases(
  p_status text default null,
  p_limit int default 200
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_status text := nullif(trim(coalesce(p_status, '')), '');
begin
  perform public.assert_admin();

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'flag_id', x.flag_id,
          'user_id', x.user_id,
          'user_handle', x.user_handle,
          'user_name', x.user_name,
          'partner_id', x.partner_id,
          'partner_handle', x.partner_handle,
          'partner_slug', x.partner_slug,
          'qualified_deposit_total', x.qualified_deposit_total,
          'cpa_paid_at', x.cpa_paid_at,
          'status', x.status,
          'risk_score', x.risk_score,
          'reasons', x.reasons,
          'notes', x.notes,
          'is_cpa_counted', x.is_cpa_counted,
          'reviewed_at', x.reviewed_at,
          'reviewed_by', x.reviewed_by,
          'created_at', x.created_at,
          'updated_at', x.updated_at,
          'payer_document_last4', x.payer_document_last4,
          'payer_linked_account_count', x.payer_linked_account_count,
          'cpf_duplicate', x.cpf_duplicate
        )
        order by x.created_at desc
      )
      from (
        select
          f.id as flag_id,
          f.user_id,
          pu.handle as user_handle,
          pu.name as user_name,
          coalesce(f.partner_id, ur.partner_id) as partner_id,
          pp.handle as partner_handle,
          pa.slug as partner_slug,
          coalesce(ur.qualified_deposit_total, 0)::numeric as qualified_deposit_total,
          ur.cpa_paid_at,
          f.status,
          f.risk_score,
          f.reasons,
          f.notes,
          f.is_cpa_counted,
          f.reviewed_at,
          f.reviewed_by,
          f.created_at,
          f.updated_at,
          coalesce(
            upi.cpf_last4,
            (
              select e.document_last4
              from public.payer_document_events e
              where e.user_id = f.user_id
              order by e.seen_at desc
              limit 1
            )
          ) as payer_document_last4,
          public.count_payer_linked_accounts(public.resolve_user_payer_cpf_hash(f.user_id))
            as payer_linked_account_count,
          public.count_payer_linked_accounts(public.resolve_user_payer_cpf_hash(f.user_id)) > 1
            as cpf_duplicate
        from public.cpa_fraud_flags f
        join public.profiles pu on pu.id = f.user_id
        left join public.user_referrals ur on ur.user_id = f.user_id
        left join public.partner_accounts pa on pa.user_id = coalesce(f.partner_id, ur.partner_id)
        left join public.profiles pp on pp.id = pa.user_id
        left join public.user_payment_identities upi on upi.user_id = f.user_id
        where v_status is null or f.status = v_status
        order by f.created_at desc
        limit greatest(1, least(coalesce(p_limit, 200), 500))
      ) x
    ),
    '[]'::jsonb
  );
end;
$$;

grant execute on function public.admin_list_cpa_fraud_cases(text, int) to authenticated;
grant execute on function public.admin_list_cpa_referrals(boolean, int) to authenticated;

-- ---------------------------------------------------------------------------
-- Backfill from processed SyncPay webhooks
-- ---------------------------------------------------------------------------
insert into public.payer_document_events (
  user_id,
  payment_intent_id,
  cpf_hash,
  document_last4,
  document_length,
  source,
  webhook_event_id,
  seen_at
)
select
  pi.user_id,
  pi.id,
  public.hash_cpf_document(doc.doc),
  right(public.normalize_cpf_digits(doc.doc), 4),
  length(public.normalize_cpf_digits(doc.doc))::smallint,
  'syncpay_cashin_backfill',
  w.id,
  coalesce(w.processed_at, w.created_at)
from public.syncpay_webhook_events w
join public.payment_intents pi on pi.id = w.intent_id
cross join lateral (
  select public.syncpay_extract_payer_document(w.payload) as doc
) doc
where w.processing_status = 'processed'
  and w.event = 'PAYMENT_RECEIVED'
  and pi.type = 'deposit'
  and doc.doc is not null
  and public.hash_cpf_document(doc.doc) is not null
on conflict (payment_intent_id) where payment_intent_id is not null
do nothing;

notify pgrst, 'reload schema';
