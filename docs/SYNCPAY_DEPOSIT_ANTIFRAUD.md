# SyncPay — depósito Pix e antifraude (documento do pagador)

## Requisito de contrato

Todo webhook `PAYMENT_RECEIVED` de cash-in deve incluir o documento do pagador em um destes campos do JSON:

- `data.debtor_account.document`
- `data.payer.document`
- `debtor_account.document` / `payer.document` (raiz)

O backend extrai via `syncpay_extract_payer_document`. Sem documento, o depósito **não é creditado** (intent `failed`, alerta admin `payer_document_missing`).

## Comportamento ViaX

| Payload | Intent | Saldo | Admin |
|---------|--------|-------|-------|
| Com documento | `paid` | creditado | clusters em `payer_document_events` |
| Sem documento | `failed` | não creditado | `user_risk_alerts` tipo `payer_document_missing` |

Migration: `supabase/migrations/20260904120000_deposit_block_payer_document_missing.sql`

## Checklist sandbox / produção

1. Gerar depósito teste e pagar o QR.
2. Confirmar no webhook de teste que `document` está presente.
3. Enviar webhook **sem** documento → intent deve ficar `failed`, alerta em `/admin/risk` (Alertas gerais).
4. Usuário na carteira deve ver mensagem de validação do pagador (não “QR expirado” genérico).

## Reconciliação manual (ops)

Se o Pix foi recebido na SyncPay mas o webhook veio sem documento:

1. Localizar o cash-in no painel SyncPay pelo `provider_id` / valor / horário.
2. Corrigir configuração para enviar `debtor_account.document` em produção.
3. Estornar no provedor ou reenviar webhook corrigido (conforme procedimento SyncPay).
4. Se necessário, crédito manual via admin após validação de identidade.

## Creators (indicação CPA)

Clusters em `/admin/risk` cruzam `payer_document_events` com `user_referrals`: cada conta do cluster mostra o creator que indicou; o resumo **Creators afetados** agrega quantas indicações de cada afiliado usam o mesmo documento do pagador. Heurística `partner_shared_payer` dispara quando o mesmo `partner_id` tem 2+ contas no cluster.

Migration: `supabase/migrations/20260905120000_payer_cluster_referring_partners.sql`

## Relacionado

- Clusters de pagador (múltiplas contas): `20260903120000_payer_document_events.sql`
- Saques: `docs/SYNCPAY_WITHDRAW.md`
