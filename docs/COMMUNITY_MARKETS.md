# Mercados da comunidade

Traders com **cadastro formal** podem criar mercados Sim/Não:

| Visibilidade | Comportamento                                                                 |
| ------------ | ----------------------------------------------------------------------------- |
| **Público**  | Listado na aba Mercados → Comunidade                                          |
| **Privado**  | Só com link `?access=TOKEN`; participantes entram via `join_community_market` |

## Regras

- Resolução pelo **criador** após `ends_at` (`resolve_community_market` → `settle_market`).
- Criador **não pode apostar** no próprio mercado.
- Oráculo automático **não** liquida mercados `market_kind = community`.
- Até **10** mercados community ativos por usuário; prazo entre 1h e 90 dias.

## RPCs

- `create_community_market`, `join_community_market`, `get_community_market`
- `list_public_community_markets`, `list_my_community_markets`
- `resolve_community_market`, `void_community_market`

## UI

- `/markets/create` — formulário
- `/markets?view=community` — listagem
- `/markets/{id}?access=…` — mercado privado

Migrations:

- `supabase/migrations/20260707000000_community_markets.sql`
- `supabase/migrations/20260708000000_community_moderation.sql` (denúncias, admin list, rate limit join)

## Moderação

- Usuários: botão **Denunciar** no detalhe do mercado (não criador).
- Admin: `/admin/markets` → seção mercados da comunidade + denúncias pendentes.
