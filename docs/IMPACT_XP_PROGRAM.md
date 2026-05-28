# Programa de XP de impacto (comunidade)

## Fluxo

1. Usuário comum cria mercado `community` e outros apostam.
2. Ao liquidar (`settle_market`), entra na fila `event_impact_xp_queue` com `eligible_at = settled_at + 6h`.
3. Cron `POST /api/public/cron/impact-xp-credit` chama `service_credit_pending_event_impact_xp`.
4. XP creditado via `apply_user_progress(..., 'event_impact', xp)` no total do perfil.
5. No dia 1 do mês, cron `impact-monthly-finalize` grava Top 3 em `monthly_impact_winners`.

## RPCs (authenticated)

- `get_monthly_impact_leaderboard(p_month, p_limit)`
- `get_my_event_impact_summary()`
- `admin_list_monthly_impact_winners(p_month)`
- `admin_mark_impact_prize_fulfilled(p_winner_id, p_notes)`

## Elegibilidade (resumo)

- Volume qualificado ≥ R$ 1.500, ≥ 12 apostadores únicos.
- Anti-concentração: top 3 apostadores ≤ 70% do volume.
- Caps: 2.500/evento, 4.000/dia, 15.000/semana por criador.

## UI

- Ranking → aba **Impacto**
- Banners em criar/listar mercados comunidade
- Admin → Comunidade → painel Top 3 mensal (marcar prêmio entregue)
