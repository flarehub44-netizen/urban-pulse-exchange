# SLOs — arquitetura, segurança e performance

## Jornadas e metas

| Jornada                       | SLI                                    | Meta inicial        |
| ----------------------------- | -------------------------------------- | ------------------- |
| Dashboard carregado           | Latência `bff.get_dashboard_snapshot`  | p95 <= 450ms        |
| Carteira carregada            | Latência `bff.get_wallet_overview`     | p95 <= 400ms        |
| Feed + notificações           | Latência `bff.get_engagement_snapshot` | p95 <= 450ms        |
| Consulta de mercados públicos | Latência de query `useMarkets`         | p95 <= 350ms        |
| Aposta confirmada             | Tempo fim-a-fim `place_bet`            | p95 <= 700ms        |
| Cron futebol (sync/resolve)   | Execução com `ok=true`                 | >= 99.5% por 7 dias |

## Coleta de métricas

- Fonte primária: logs JSON do Worker com `kind: "api_metric"`.
- Campos mínimos: `endpoint`, `durationMs`, `ok`, `ts`.
- Endpoints monitorados:
  - `bff.get_dashboard_snapshot`
  - `bff.get_wallet_overview`
  - `bff.get_engagement_snapshot`
  - `bff.get_account_context`
  - `cron.football_sync`
  - `cron.football_resolve`

## Regras operacionais

1. Falha de SLO por 2 janelas consecutivas exige investigação de query/RPC.
2. Mudanças em RPC/migrations de alto tráfego devem comparar p95 antes/depois.
3. Qualquer endpoint crítico novo entra com `logApiMetric` obrigatório.
