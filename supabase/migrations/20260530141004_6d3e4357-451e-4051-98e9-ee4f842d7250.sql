
-- C1: service_process_syncpay_webhook → refund on PAYOUT_FAILED
CREATE OR REPLACE FUNCTION public.service_process_syncpay_webhook(p_provider_id text, p_event text, p_payload jsonb, p_signature text DEFAULT NULL::text, p_provider_event_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  if p_provider_id is null or length(trim(p_provider_id)) = 0 then raise exception 'provider_id required'; end if;
  if p_event is null or length(trim(p_event)) = 0 then raise exception 'event required'; end if;
  if p_provider_event_id is null or length(trim(p_provider_event_id)) = 0 then raise exception 'provider_event_id required'; end if;

  v_dedupe_key := trim(p_provider_event_id);

  select * into v_intent from public.payment_intents where provider_id = p_provider_id for update;

  insert into public.syncpay_webhook_events (provider_id, provider_event_id, event, dedupe_key, signature, payload, intent_id)
  values (p_provider_id, p_provider_event_id, p_event, v_dedupe_key, p_signature, p_payload, v_intent.id)
  on conflict (dedupe_key) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    return jsonb_build_object('ok', true, 'already_processed', true, 'action', 'deduped');
  end if;

  if v_intent.id is null then
    update public.syncpay_webhook_events set processing_status = 'ignored', processing_note = 'unknown_provider_id', processed_at = now() where id = v_event_id;
    return jsonb_build_object('ok', true, 'ignored', true, 'reason', 'unknown_provider_id');
  end if;

  if v_intent.status <> 'pending' then
    update public.syncpay_webhook_events set processing_status = 'ignored', processing_note = 'intent_not_pending', processed_at = now() where id = v_event_id;
    return jsonb_build_object('ok', true, 'already_processed', true, 'action', 'intent_not_pending');
  end if;

  v_payer_doc := public.syncpay_extract_payer_document(p_payload);

  if p_event = 'PAYMENT_RECEIVED' and v_intent.type = 'deposit' then
    if v_payer_doc is null then
      begin
        perform public.record_user_risk_alert(v_intent.user_id, 'payer_document_missing',
          'Depósito Pix confirmado pela SyncPay sem documento do pagador. Crédito bloqueado.',
          jsonb_build_object('intent_id', v_intent.id, 'amount', v_intent.amount, 'provider_id', p_provider_id, 'provider_event_id', p_provider_event_id, 'webhook_event_id', v_event_id));
      exception when others then null;
      end;
      v_new_status := 'failed';
      v_action := 'deposit_payer_cpf_missing';
      v_note := 'payer_document_missing';
    else
      perform public.service_record_payer_document_event(v_intent.user_id, v_payer_doc, v_intent.id, v_event_id, 'syncpay_cashin');
      perform public.service_upsert_payment_identity(v_intent.user_id, v_payer_doc, 'syncpay_cashin');
      v_linked_count := public.count_payer_linked_accounts(public.hash_cpf_document(v_payer_doc));
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
      -- C1 FIX: actually refund the withheld balance back to the user
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
             'payer_document_captured', v_payer_doc is not null,
             'cpf_check', coalesce(v_note, case when v_payer_doc is not null then 'ok' else null end),
             'payer_document_last4', case when v_payer_doc is not null then right(public.normalize_cpf_digits(v_payer_doc), 4) else null end,
             'payer_linked_account_count', case when v_payer_doc is not null then v_linked_count else null end
           ),
           updated_at = now()
     where id = v_intent.id;
  end if;

  update public.syncpay_webhook_events
     set processing_status = case when v_new_status is null then 'ignored' else 'processed' end,
         processing_note = coalesce(v_note, v_action),
         processed_at = now()
   where id = v_event_id;

  return jsonb_build_object('ok', true, 'action', coalesce(v_action, 'ignored'), 'status', coalesce(v_new_status, v_intent.status), 'intent_id', v_intent.id, 'payer_document_captured', v_payer_doc is not null, 'payer_linked_account_count', v_linked_count);
exception when others then
  if v_event_id is not null then
    update public.syncpay_webhook_events set processing_status = 'error', processing_note = sqlerrm, processed_at = now() where id = v_event_id;
  end if;
  raise;
end;
$function$;

-- C2: admin_resolve_market → use assert_admin() (enforces MFA)
CREATE OR REPLACE FUNCTION public.admin_resolve_market(p_market_id text, p_winning_side bet_side, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_market markets%rowtype;
begin
  perform public.assert_admin();

  select * into v_market from public.markets where id = p_market_id for update;
  if not found then raise exception 'Market not found'; end if;
  if v_market.status not in ('dispute', 'resolving', 'closed') then
    raise exception 'Market not in disputable state: %', v_market.status;
  end if;

  insert into public.market_resolutions (market_id, status, derived_side, source, validation)
  values (p_market_id, 'validated', p_winning_side, 'admin', jsonb_build_object('note', coalesce(p_note, '')));

  return public.settle_market(p_market_id, p_winning_side);
end;
$function$;

-- C3: Drop legacy 3-arg place_football_bet (no idempotency, no banned-account check)
DROP FUNCTION IF EXISTS public.place_football_bet(text, football_outcome, numeric);

-- C4: Revert profile_public to security_definer behaviour (needed for public feed of profiles)
ALTER VIEW public.profile_public SET (security_invoker = false);

-- M12: Lock down wallet_deposit — must only be callable by service_role (already so, but enforce explicitly)
REVOKE EXECUTE ON FUNCTION public.wallet_deposit(numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_deposit(numeric) TO service_role;

-- And casino_quick_deposit calls wallet_deposit directly → ensure it's also service-only
REVOKE EXECUTE ON FUNCTION public.casino_quick_deposit(numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.casino_quick_deposit(numeric, text) TO service_role;
