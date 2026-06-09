# Runbook financeiro — ViaX

Procedimentos operacionais para incidentes Pix, webhooks e reconciliação. Complementa [`SYNCPAY_WITHDRAW.md`](./SYNCPAY_WITHDRAW.md), [`SYNCPAY_DEPOSIT_ANTIFRAUD.md`](./SYNCPAY_DEPOSIT_ANTIFRAUD.md) e [`COMPLIANCE_DATA_RETENTION.md`](./COMPLIANCE_DATA_RETENTION.md).

## Contatos e pré-requisitos

- Acesso admin ViaX (`/admin/finance`, `/admin/risk`)
- Supabase Dashboard (projeto `rzhffxiicufqcabmhscq`) — SQL Editor, Logs
- Painel SyncPay + logs Cloudflare Worker / Lovable Cloud
- Secrets: `SUPABASE_SERVICE_ROLE_KEY`, `SYNCPAY_WEBHOOK_SECRET`, `CRON_SECRET`

---

## 1. Depósito Pix — QR gerado mas saldo não creditou

### Sintomas

- `payment_intents.status = pending` após pagamento confirmado no banco do usuário
- Usuário reporta Pix pago; UI ainda mostra pendente

### Diagnóstico

```sql
-- Intent do usuário
select id, user_id, type, status, amount, provider_id, created_at, meta
from public.payment_intents
where user_id = '<uuid>'
order by created_at desc
limit 10;

-- Webhooks recebidos (dedupe)
select dedupe_key, event, provider_id, processing_status, created_at
from public.syncpay_webhook_events
where provider_id = '<provider_id>'
   or payload->>'data'->>'id' = '<provider_id>'
order by created_at desc;
```

1. Conferir logs Worker: `[SyncPay Webhook] processed` vs `Invalid signature` / `process_failed`
2. Verificar URL registrada no SyncPay: `https://viax.life/api/public/webhooks/syncpay`
3. Confirmar `SYNCPAY_WEBHOOK_SECRET` idêntico em Lovable Cloud e Wrangler

### Resolução

| Causa | Ação |
|-------|------|
| Webhook nunca chegou | Reenviar evento no painel SyncPay ou POST manual com assinatura válida |
| Assinatura inválida | Rotacionar secret no SyncPay + atualizar env; reenviar webhook |
| `payer_document` ausente | Migration `20260904120000` bloqueia crédito — verificar payload SyncPay |
| Intent órfão | Rodar reconciliação (seção 4) |

**Nunca** creditar saldo via `UPDATE profiles SET balance` manual. Usar sempre `service_process_syncpay_webhook` ou fluxo admin documentado.

---

## 2. Webhook duplicado / replay

### Comportamento esperado

- RPC `service_process_syncpay_webhook` usa `dedupe_key` / `provider_event_id`
- Replay idempotente retorna 200 sem double-credit

### Verificação

```sql
select count(*), dedupe_key
from public.syncpay_webhook_events
group by dedupe_key
having count(*) > 1;
```

Se double-credit ocorreu (crítico): congelar conta (`admin_freeze_account`), abrir incidente, estornar via processo jurídico — **não** apagar `payment_intents`.

---

## 3. Saque Pix — pending eterno

Ver [`SYNCPAY_WITHDRAW.md`](./SYNCPAY_WITHDRAW.md).

### Diagnóstico rápido

```sql
select id, user_id, type, status, amount, pix_key, provider_id, created_at, meta
from public.payment_intents
where type = 'withdraw' and status = 'pending'
order by created_at asc;
```

| Causa | Ação |
|-------|------|
| `PAYOUT_COMPLETED` não recebido | Reconciliar via seção 4 |
| `PAYOUT_FAILED` | `service_refund_withdrawal` deve ter estornado — confirmar saldo |
| `unknown_provider_id` | Fallback por `correlation_id = intent_id` (migration `20260824000000`) |

---

## 4. Reconciliação manual (intents pending > 2 min)

Rota: `POST /api/public/hooks/reconcile-syncpay-payouts`  
Código: [`src/routes/api/public/hooks/reconcile-syncpay-payouts.ts`](../src/routes/api/public/hooks/reconcile-syncpay-payouts.ts)

Consulta intents com `provider_id` preenchido, consulta status na API SyncPay e reprocessa via `service_process_syncpay_webhook`.

**Uso:** cron interno ou chamada manual protegida (mesmo ambiente do Worker com secrets).

Smoke pós-incidente:

```bash
curl -X POST "https://viax.life/api/public/hooks/reconcile-syncpay-payouts"
```

(Proteger com auth interno se exposto publicamente — verificar config de rota no deploy.)

---

## 5. Alertas automáticos (health check)

Cron: `POST /api/public/cron/health-check` (ver [`OPS_CRONS.md`](./OPS_CRONS.md))

Falha quando:

- Último `lifecycle_tick_runs` > 5 min
- `payment_intents` pending > 24h (contagem)
- `syncpay_webhook_events` com falha nas últimas 24h

---

## 6. Retenção e compliance

- **Não** `DELETE` em `payment_intents` paid/failed (5 anos — Lei 9.613/98)
- **Não** purgar `syncpay_webhook_events` sem sign-off jurídico
- Ver [`COMPLIANCE_DATA_RETENTION.md`](./COMPLIANCE_DATA_RETENTION.md)

---

## 7. Checklist pós-incidente financeiro

- [ ] Intent e webhook auditados (SQL acima)
- [ ] Saldo do usuário consistente com `transactions`
- [ ] Log SyncPay + Worker arquivados
- [ ] Entrada em `admin_actions` se ação manual admin
- [ ] Usuário notificado se impacto direto

---

## 8. Checklist secrets (produção)

| Item | Onde verificar |
|------|----------------|
| `cpf_hmac_secret` em `platform_settings` | SQL: `select key from platform_settings where key = 'cpf_hmac_secret'` |
| Invite admin rotacionado (não `VIAX-OPS-2026`) | `admin_invites` — uso único |
| `admin_allowlist` mínima | `select * from admin_allowlist` |
| Leaked password protection | Supabase Dashboard → Auth → Password Security |
| Bucket `community-covers` sem listagem pública | Storage → Policies → disable list for anon |

Ver também [`DEPLOY_CHECKLIST.md`](./DEPLOY_CHECKLIST.md).
