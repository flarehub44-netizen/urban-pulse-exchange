# Mercados multi-outcome (plataforma Polymarket-style)

## Modelo

ViaX usa **parimutuel N vias** para mercados genéricos (`prediction_markets`), além dos modelos existentes:

| Tipo           | Tabela                                   | Aposta                  |
| -------------- | ---------------------------------------- | ----------------------- |
| Binário urbano | `markets`                                | `place_bet`             |
| Futebol 1X3    | `football_markets`                       | `place_football_bet`    |
| Multi-outcome  | `prediction_markets` + `market_outcomes` | `place_outcome_bet`     |
| Crypto slot    | `crypto_slot_markets`                    | `place_crypto_slot_bet` |

## Taxonomia

- **`market_vertical`** — trânsito, copa, política, crypto, tech, etc.
- **`market_topic_catalog`** + **`market_topic_assignments`** — tags para sidebar
- **`market_collections`** — hubs (`copa-2026`, `copa-props`)

## Catálogo unificado

RPC **`list_catalog_markets`** retorna JSON normalizado para UI (`CatalogMarket`).

Frontend: `useUnifiedCatalog()` em [`src/hooks/use-catalog-markets.ts`](../src/hooks/use-catalog-markets.ts).

## Rotas

| Rota                  | Uso                   |
| --------------------- | --------------------- |
| `/v/$vertical`        | Página de categoria   |
| `/v/$vertical/$topic` | Subcategoria          |
| `/copa`               | Hub Copa 2026         |
| `/pm/$marketId`       | Detalhe multi-outcome |

## Admin

- `admin_create_prediction_market` — criar mercado + outcomes
- `settle_outcome_market` — liquidar vencedor
- BFF: [`src/actions/admin/prediction-markets.ts`](../src/actions/admin/prediction-markets.ts)

## Deploy

```bash
npm run db:push
```

Migrations: `20261101000000_*` … `20261101000004_*`.

## Flags

- `crypto_short_term_enabled` — slots BTC up/down (`cron_open_crypto_slot`)
- `copa_league_ids` — ligas WC para tag `copa-2026` no sync
