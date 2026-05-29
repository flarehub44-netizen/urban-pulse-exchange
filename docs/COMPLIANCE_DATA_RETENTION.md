# Retenção de dados e LGPD — ViaX

Documento de referência operacional (não substitui parecer jurídico).

## Escopo

| Dado | Tabela / local | Retenção mínima sugerida | Observações |
|------|----------------|-------------------------|-------------|
| Transações Pix | `payment_intents` | **5 anos** | Comentário em migration `20260827030000`; delete bloqueado por trigger |
| Webhooks SyncPay | `syncpay_webhook_events` | **5 anos** (metadados) | `payload` completo: revisar redução após 24–36 meses |
| Velocity (hash) | `security_velocity_events` | **12 meses** | Sem IP em claro; apenas `ip_hash` / `device_hash` |
| Alertas de risco | `user_risk_alerts` | **5 anos** | Suporte a disputas e PLD |
| Perfis / CPF | `profiles.cpf` | Vigência da conta + obrigações legais | CPF mascarado na UI via `mask_cpf` |

## Base legal (alto nível)

- Execução de contrato e prevenção à fraude (art. 7º, V e IX, LGPD).
- Obrigações PLD/CFT alinhadas à Lei 9.613/98 e normas do BCB para registros de transações.

## Direitos do titular

- Acesso e correção: suporte via canal oficial; alteração de CPF apenas via `update_profile_cpf` com validação.
- Eliminação: soft-delete / ban preserva trilha financeira quando exigido por lei.

## Procedimentos

1. **Não** executar `DELETE` em `payment_intents` com status `paid` ou `failed`.
2. Purge de `syncpay_webhook_events.payload` apenas após aprovação jurídica e em staging primeiro.
3. Rotacionar secrets (`app.cpf_hmac_secret`, `VELOCITY_HMAC_SECRET`) com plano de re-hash se necessário.

## Contato

Definir DPO / encarregado e e-mail de privacidade nas políticas públicas do produto.
