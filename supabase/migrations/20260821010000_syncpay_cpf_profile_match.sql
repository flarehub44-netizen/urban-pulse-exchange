-- Enforce CPF consistency between registered profile and Pix payer document.

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
    if v_profile_cpf_digits is null then
      v_new_status := 'failed';
      v_action := 'deposit_profile_cpf_missing';
      v_note := 'profile_cpf_missing';
    elsif v_payer_digits is null then
      v_new_status := 'failed';
      v_action := 'deposit_payer_cpf_missing';
      v_note := 'payer_document_missing';
    elsif v_payer_digits <> v_profile_cpf_digits then
      v_new_status := 'failed';
      v_action := 'deposit_cpf_mismatch';
      v_note := 'payer_document_mismatch';
    else
      perform public.service_upsert_payment_identity(
        v_intent.user_id,
        v_payer_doc,
        'syncpay_cashin'
      );
      perform public.service_credit_balance(v_intent.user_id, v_intent.amount, v_intent.id);
      v_new_status := 'paid';
      v_action := 'credited';
    end if;
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

revoke execute on function public.service_process_syncpay_webhook(text, text, jsonb, text, text)
  from anon, authenticated;
grant execute on function public.service_process_syncpay_webhook(text, text, jsonb, text, text)
  to service_role;
