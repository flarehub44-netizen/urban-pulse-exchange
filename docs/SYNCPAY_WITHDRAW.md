# Saque Pix (SyncPay) — carteira do jogador

## Fluxo

1. Usuário em `/wallet?tab=withdraw` informa valor e chave Pix.
2. `initiateWithdrawFn` chama `request_withdrawal` (reserva saldo + `payment_intents` pending).
3. Worker chama SyncPay `POST /payouts/pix` com `correlation_id = intent_id`.
4. Webhook `PAYOUT_COMPLETED` marca intent como `paid` e notifica o usuário.
5. `PAYOUT_FAILED` chama `service_refund_withdrawal` (estorna saldo + notificação).

## Variáveis de ambiente (Cloudflare Worker)

| Variável | Uso |
|----------|-----|
| `SYNCPAY_API_URL` | Base da API (padrão `https://api.syncpay.com.br/v1`) |
| `SYNCPAY_API_KEY` | Bearer para criar payouts |
| `SYNCPAY_WEBHOOK_SECRET` | HMAC do webhook |
| `SUPABASE_SERVICE_ROLE_KEY` | Atualizar intents / RPC de webhook |

Registrar webhook: `https://<seu-worker>/api/public/webhooks/syncpay`

Eventos necessários: `PAYOUT_COMPLETED`, `PAYOUT_FAILED` (e depósitos: `PAYMENT_RECEIVED`, etc.).

```bash
npx wrangler secret put SYNCPAY_API_KEY
npx wrangler secret put SYNCPAY_WEBHOOK_SECRET
```

## Regras de negócio (`request_withdrawal`)

- Mínimo R$ 10, máximo R$ 5.000
- Cadastro completo (`registration_required`)
- CPF válido no perfil (validado no BFF antes da RPC)
- Saques > R$ 100 exigem `kyc_status = approved`
- Chave Pix tipo CPF deve coincidir com CPF do perfil
- `profiles.pix_key` atualizada a cada saque

## RPC legadas

`wallet_withdraw` e `wallet_deposit` **não** estão mais disponíveis para `authenticated`. Use sempre a carteira Pix.

## Troubleshooting

| Sintoma | Causa provável |
|---------|----------------|
| `SYNCPAY_API_KEY not configured` | Secret ausente no Worker |
| `Saldo insuficiente` | Saldo menor que o valor solicitado |
| `kyc_required` | Saque > R$ 100 sem KYC aprovado (admin em `/admin/users`) |
| `unknown_provider_id` no webhook | `provider_id` não gravado no intent; fallback por `correlation_id` na migration `20260824000000` |
| Saque pendente eterno | Webhook não chegou ou assinatura inválida — conferir painel SyncPay e logs do Worker |

## Deploy

```bash
npm run db:push
npm run deploy
```

## Testes E2E

Com `PLAYWRIGHT_TEST_*`, `SYNCPAY_API_KEY` e `SYNCPAY_WEBHOOK_SECRET`:

```bash
npm run test:e2e -- e2e/syncpay-webhook.spec.ts
```
