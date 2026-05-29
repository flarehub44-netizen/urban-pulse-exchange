-- LGPD / compliance: document retention for webhook audit table.

create index if not exists syncpay_webhook_events_created_at_idx
  on public.syncpay_webhook_events (created_at desc);

comment on table public.syncpay_webhook_events is
  'Auditoria de webhooks SyncPay (idempotência e reconciliação). '
  'RETENÇÃO: manter registro mínimo (dedupe_key, event, provider_id, timestamps, processing_status) '
  'por no mínimo 5 anos alinhado a payment_intents (Lei 9.613/98). '
  'Após 24–36 meses, avaliar anonimização do campo payload (sem purge automático em produção '
  'sem sign-off jurídico). Ver docs/COMPLIANCE_DATA_RETENTION.md.';
