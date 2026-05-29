# Tabletop — fraude CPA e Pix (90 min)

## Participantes sugeridos

- Engenharia (backend + admin)
- Operações / risco
- Produto afiliados
- Jurídico/compliance (opcional)

## Cenário 1 — Cluster multi-CPF (automático)

**Contexto:** `service_fraud_cluster_sweep` com `fraud_cluster_min_accounts = 3`.

1. Três contas indicadas pelo mesmo partner depositam com o mesmo documento pagador.
2. Cron `POST /api/public/cron/fraud-cluster-sweep` roda com `fraud_cluster_sweep_dry_run = false`.
3. Verificar: partner `suspended`, flags `cpa_fraud_flags` em `confirmed` com `auto_cluster_sweep`.

**Perguntas:** Quem reverte CPA já provisionado? (`admin_clear_cpa_fraud_cases` manual.)

## Cenário 2 — Velocity IP

1. Mesmo IP tenta 6 cadastros em 1h (`velocity_signup_ip_max = 5`).
2. Verificar bloqueio em `recordSignupVelocityFn` e evento em `security_velocity_events`.

## Cenário 3 — KYC cross-CPF

1. Duas contas com mesmo CPF; primeira saca R$ 99; segunda tenta R$ 99 no mesmo mês.
2. Esperado: `kyc_required_cumulative` na segunda conta.

## Cenário 4 — Admin comprometido

1. Atacante obtém sessão admin sem MFA.
2. Com `admin_mfa_required = true`, painel `/admin` redireciona para configurar TOTP.

## Cenário 5 — Webhook

1. Replay com `x-syncpay-event-id` duplicado → dedupe.
2. Payload sem documento pagador → depósito não creditado + alerta.

## Checklist pós-exercício

- [ ] Atualizar runbooks em `docs/SECURITY.md`
- [ ] Confirmar `fraud_cluster_sweep_dry_run` em produção
- [ ] Revisar métricas: `user_risk_alerts`, fila CPA em `/admin/risk`
- [ ] Registrar ata com ações e responsáveis
