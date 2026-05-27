# Matriz QA T01–T15 (atualizada 2026-05-26)

Legenda: ✅ passa · ⚠️ parcial · ❌ falha · ⏭️ requer auth/manual · 🔧 corrigido em código

| ID  | Cenário                   | Resultado hoje | Notas                                                  |
| --- | ------------------------- | -------------- | ------------------------------------------------------ |
| T01 | Primeira visita (landing) | ✅             | Landing, CTAs Entrar/Criar conta, eventos sazonais     |
| T02 | Aposta SIM / mercados     | ✅             | Fix TDZ `markets/index.tsx` (P0). E2E anti-crash       |
| T03 | Saldo zero                | ⏭️             | Requer login + carteira                                |
| T04 | Liquidação                | ⏭️             | Manual / SQL acceptance                                |
| T05 | Near-miss casino          | ⏭️             | Requer casino enabled + auth                           |
| T06 | Daily check-in            | ⏭️             | Requer auth registrado                                 |
| T07 | Roleta 2x                 | ⏭️             | Idempotência server-side em `casino_daily_spin`        |
| T08 | Partner ref `/r/:slug`    | ✅             | Redirect ou erro amigável                              |
| T09 | Comissão partner          | ⏭️             | Requer partner ativo + depósito indicado               |
| T10 | Liga                      | ⏭️             | Requer auth registrado                                 |
| T11 | Admin                     | ⚠️             | Shell OK; RPCs exigem allowlist                        |
| T12 | E-mail perfil             | ⏭️             | Requer auth                                            |
| T13 | Mobile 375px              | ✅             | Bottom nav + mercados scroll; dashboard abaixo do fold |
| T14 | Offline mid-bet           | ⏭️             | Cenário manual                                         |
| T15 | Double-click aposta       | ✅             | `place_bet` idempotency key (P2)                       |

## Funil de conversão (< 3 min)

1. Landing → **Criar conta** (header + hero)
2. Signup modal → `/markets` ou `/dashboard`
3. Carteira → depósito Pix (SyncPay staging/prod)
4. Primeira aposta com `idempotencyKey` no order-box

## Retenção (validar pós-auth)

- Daily check-in + missões (`daily-missions`, `daily-pulse`)
- Push digest + mercado fechando (`push-scheduler`, notificações)
- Relatório semanal (`weekly-report-modal`)

## Escala

- Rate limit: crons, webhooks, `place_bet` (10/min)
- Realtime: canais privados + RLS (`20260717000000_realtime_messages_rls`)
- Vision worker + football crons separados do Worker principal

## Como rodar

```bash
npm run test:e2e -- e2e/qa-matrix.spec.ts
npm run test:e2e -- e2e/smoke.spec.ts
```
