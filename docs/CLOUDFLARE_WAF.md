# Cloudflare WAF — ViaX

Complemento ao rate limit em Postgres (`security_velocity_events` / `service_assert_velocity_limit`).

## Regras recomendadas (produção)

1. **Rate limiting** em `/api/public/webhooks/syncpay` — ex.: 60 req/min por IP.
2. **Rate limiting** em `/api/public/cron/*` — bloquear tráfego público sem assinatura HMAC válida (defesa em profundidade; o app já exige `CRON_HMAC_SECRET`).
3. **Bot Fight Mode** ou Managed Ruleset na zona do app.
4. **Logpush** (opcional) — amostra de logs para correlacionar `cf-connecting-ip` com `security_velocity_events` via hash no Worker (`VELOCITY_HMAC_SECRET`).

## Secrets no Worker

| Variável | Uso |
|----------|-----|
| `VELOCITY_HMAC_SECRET` | Hash de IP/dispositivo no BFF (`src/lib/velocity.server.ts`) |
| `CRON_HMAC_SECRET` | Cron jobs incluindo `fraud-cluster-sweep` |

## Cron fraud cluster

Agendar `POST /api/public/cron/fraud-cluster-sweep` (ex.: a cada 6h) com headers HMAC de cron.

Enquanto `platform_settings.fraud_cluster_sweep_dry_run = true`, o job apenas simula contagens (não suspende partners). Desligar dry-run após validação em staging.
