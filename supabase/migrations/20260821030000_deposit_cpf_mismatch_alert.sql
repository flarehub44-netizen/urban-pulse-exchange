-- Depósito Pix: sempre credita; alerta admin se CPF do pagador ≠ CPF do perfil.

create table if not exists public.user_risk_alerts (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  alert_type text not null,
  severity text not null default 'medium'
    check (severity in ('low', 'medium', 'high')),
  detail text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists user_risk_alerts_user_created_idx
  on public.user_risk_alerts (user_id, created_at desc);

create index if not exists user_risk_alerts_open_idx
  on public.user_risk_alerts (created_at desc)
  where resolved_at is null;

alter table public.user_risk_alerts enable row level security;

drop policy if exists user_risk_alerts_deny_all on public.user_risk_alerts;
create policy user_risk_alerts_deny_all
  on public.user_risk_alerts
  for all
  to authenticated
  using (false)
  with check (false);

create or replace function public.record_user_risk_alert(
  p_user_id uuid,
  p_alert_type text,
  p_detail text,
  p_meta jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_intent_id text := nullif(trim(coalesce(p_meta ->> 'intent_id', '')), '');
begin
  if p_user_id is null or p_alert_type is null or length(trim(p_alert_type)) = 0 then
    return;
  end if;
  if p_detail is null or length(trim(p_detail)) = 0 then
    return;
  end if;

  if v_intent_id is not null and exists (
    select 1
    from public.user_risk_alerts a
    where a.user_id = p_user_id
      and a.alert_type = p_alert_type
      and a.meta ->> 'intent_id' = v_intent_id
  ) then
    return;
  end if;

  insert into public.user_risk_alerts (user_id, alert_type, severity, detail, meta)
  values (
    p_user_id,
    p_alert_type,
    'medium',
    trim(p_detail),
    coalesce(p_meta, '{}'::jsonb)
  );
end;
$$;

revoke execute on function public.record_user_risk_alert(uuid, text, text, jsonb) from public;
grant execute on function public.record_user_risk_alert(uuid, text, text, jsonb) to service_role;

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
  v_payer_digits text;
  v_profile_cpf_digits text;
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
  v_payer_digits := public.normalize_cpf_digits(v_payer_doc);
  select public.normalize_cpf_digits(p.cpf)
    into v_profile_cpf_digits
  from public.profiles p
  where p.id = v_intent.user_id;

  if p_event = 'PAYMENT_RECEIVED' and v_intent.type = 'deposit' then
    if v_payer_doc is not null then
      perform public.service_upsert_payment_identity(
        v_intent.user_id,
        v_payer_doc,
        'syncpay_cashin'
      );
    end if;

    if v_profile_cpf_digits is not null
       and v_payer_digits is not null
       and v_payer_digits <> v_profile_cpf_digits then
      perform public.record_user_risk_alert(
        v_intent.user_id,
        'deposit_cpf_mismatch',
        'Depósito Pix com CPF do pagador diferente do CPF cadastrado no perfil.',
        jsonb_build_object(
          'intent_id', v_intent.id,
          'amount', v_intent.amount,
          'profile_cpf_last4', right(v_profile_cpf_digits, 4),
          'payer_cpf_last4', right(v_payer_digits, 4)
        )
      );
      v_note := 'payer_document_mismatch';
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
      perform public.service_refund_withdrawal(v_intent.user_id, v_intent.amount, v_intent.id);
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
               when v_payer_digits is not null then right(v_payer_digits, 4)
               else null
             end,
             'cpf_check', coalesce(v_note, 'ok')
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
    'cpf_mismatch_alert', v_note = 'payer_document_mismatch'
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

create or replace function public.get_admin_risk_alerts()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_alerts jsonb := '[]'::jsonb;
begin
  perform public.assert_admin();

  select v_alerts || coalesce(jsonb_agg(jsonb_build_object(
    'type', 'volume_spike',
    'user_id', user_id,
    'username', (select handle from public.profiles where id = user_id),
    'detail', 'Volume > 5000 nas últimas 24h',
    'severity', 'medium'
  )), '[]'::jsonb) into v_alerts
  from (
    select user_id, sum(stake) as vol
    from public.bets
    where created_at >= now() - interval '24 hours'
    group by user_id
    having sum(stake) > 5000
  ) q;

  select v_alerts || coalesce((
    select jsonb_agg(row_data order by created_at desc)
    from (
      select
        jsonb_build_object(
          'type', a.alert_type,
          'user_id', a.user_id,
          'username', (select handle from public.profiles where id = a.user_id),
          'detail', a.detail,
          'severity', a.severity,
          'alert_id', a.id,
          'created_at', a.created_at
        ) as row_data,
        a.created_at
      from public.user_risk_alerts a
      where a.resolved_at is null
      order by a.created_at desc
      limit 100
    ) alerts_subset
  ), '[]'::jsonb) into v_alerts;

  return v_alerts;
end;
$$;
