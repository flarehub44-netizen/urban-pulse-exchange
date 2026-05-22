# Plano de QA Sênior — Plataforma ViaX

Auditoria end-to-end estruturada em 4 fases. Entrega final: relatório consolidado em `/mnt/documents/QA_REPORT_2026-05-22.md` + CSV de evidências atualizado, com diagnóstico geral, lista de bugs priorizados e roadmap de correção.

## Escopo mapeado (do código)

**App (16 rotas usuário):** `/`, `/dashboard`, `/markets`, `/markets/:id`, `/feed`, `/feed/:postId`, `/leagues`, `/live`, `/notifications`, `/positions`, `/profile`, `/profile/:userId`, `/ranking`, `/settings`, `/urbanmind`, `/wallet`
**Admin (11):** overview, finance, intelligence, markets, partners, risk, settlement, simulator, sources, system, users
**Partner (10):** index, analytics, campaigns, creatives, invites, leaderboard, payouts, performance, revenue, sub-affiliates
**APIs/webhooks:** `/api/webhooks/syncpay`, `/r/:slug` (partner attribution), `/sitemap.xml`
**Server fns / integrações:** bets, casino, events, feed, follows, leagues, notifications, payments (SyncPay), polls, retention

## Fase 1 — Diagnóstico estático (sem alterar código)

1. Verificar build (`bun run build` deve estar verde — relatado pelo harness).
2. Rodar unit tests: `bun run test` (vitest — 10 specs esperados).
3. Conferir tipos: `tsc --noEmit` (somente leitura do output já existente).
4. Auditar console/network do preview atual (`/`) — capturar erros já visíveis (já vi `Missing SUPABASE_URL` no published; preview parece OK).
5. Rodar `supabase--linter` e revisar RLS / políticas.
6. Listar secrets configurados (sem expor) para validar SyncPay, AI Gateway.

## Fase 2 — Testes automatizados (Playwright)

Executar a suite e2e já existente contra o preview (`PLAYWRIGHT_BASE_URL=<preview>`):

- `smoke.spec.ts` — landing, markets, dashboard, redirects
- `qa-matrix.spec.ts` — T01–T13 (matriz QA completa)
- `auth-wallet.spec.ts` — auth anônima, carteira, abas perfil
- `bet-flow.spec.ts` — placement de aposta, saldo, double-click
- `markets-filters.spec.ts` — filtros, busca, ordenação
- `gamification.spec.ts` — daily pulse, missions, spin
- `social.spec.ts` — feed, follows, comments
- `admin-guards.spec.ts` — guards admin/partner
- `camera-stream.spec.ts` — câmeras live

Capturar pass/fail por spec, anexar logs de falhas.

## Fase 3 — Validação manual via browser tool

Para cada fluxo crítico, navegar via `browser--navigate_to_sandbox` + `act/observe` + screenshot:

**3.1 Auth & onboarding**
- Primeira visita → sign-in anônimo automático → banner de upgrade aparece
- Upgrade anon → email (form em `/profile?tab=config`)
- Logout / re-login

**3.2 Core: mercados e apostas**
- Listar `/markets?status=live` (≥3 cards esperados)
- Abrir detalhe, ver order-box, candles, prob-bar
- Tentar apostar com saldo 0 (deve bloquear + mostrar deposit bar)
- Depositar via wallet (mock), apostar YES e NO, verificar pool atualiza
- Double-click no botão de aposta (não duplicar)
- Cancelar / re-abrir bet confirm dialog

**3.3 Carteira & transações**
- `/profile?tab=carteira` — saldo, depósito, saque, histórico de tx
- `/positions` — posições abertas, P&L
- Liquidação manual via admin → conferir payout no histórico do user

**3.4 Gamificação & retention**
- Daily check-in (2x → segundo bloqueado)
- Roleta diária (`casino_daily_spin`) 2x
- Missões diárias, weekly challenge, badges, divisão
- Streak risk banner

**3.5 IA / UrbanMind**
- `/urbanmind` — digest, accuracy chart, archetype card
- AI prediction em market-card / order-box (consistência YES/NO + confiança)
- Suggest feed market

**3.6 Social**
- `/feed` — listar posts, comentar, curtir
- `/feed/:postId` — detalhe
- `/ranking`, `/leagues`, `/profile/:userId` (perfil público)

**3.7 Live / câmeras / mapa**
- `/live` — strip de câmeras, heatmap, neighborhood widget
- Reprodução de stream (HLS)

**3.8 Notificações**
- `/notifications` — listar, marcar lida, prefs em `/settings`

**3.9 Partner**
- `/r/:slug` válido + inválido (atribuição + redirect)
- `/partner` portal: campaigns, creatives, invites, payouts, revenue
- Comissão após settlement (manual com 2 contas)

**3.10 Admin**
- `/admin` shell, settlement, dispute, ops panel, audit log, claim
- Criar mercado, freeze, resolve expired
- Tabela de mercados, region volume

**3.11 Pagamentos (SyncPay)**
- Criar pagamento → callback webhook `/api/webhooks/syncpay`
- Verificar assinatura do webhook, atualização de saldo, tx_id idempotente
- Casos: aprovado, recusado, timeout, payload inválido

**3.12 Mobile (375×812)**
- Bottom nav, scroll, order-box, carousel de mercados
- Performance em CPU throttle 4×

## Fase 4 — Edge cases & não-funcionais

- Campos vazios em todos os forms (settings, bet, deposit, feed comment)
- Inputs inválidos (stake negativa, > saldo, valores absurdos)
- Network offline mid-bet (DevTools)
- Rate limit: 20 cliques rápidos
- Dois usuários simultâneos no mesmo mercado
- Lighthouse na landing (LCP, CLS, TBT) — preview e produção
- SEO: title/meta/og por rota, sitemap.xml, robots.txt

## Entregáveis

1. `/mnt/documents/QA_REPORT_2026-05-22.md`
   - Diagnóstico geral (✅ / ⚠️ / ❌)
   - Bugs por gravidade (Crítico / Alto / Médio / Baixo) com: funcionalidade, página, ação, esperado, obtido, impacto, evidência (screenshot/log)
   - UX issues
   - Performance findings
   - Falhas em IA & pagamentos
   - Plano de correção priorizado (com effort estimate)
   - Sugestões de produto: conversão, retenção, escala
2. `/mnt/documents/QA_EVIDENCE_2026-05-22.csv` — matriz atualizada com resultados reais
3. Screenshots em `/mnt/documents/qa-screenshots/`

## Observações

- **Sem alterações de código nesta fase** — modo plano. Bugs encontrados viram tickets no relatório; correção em fase posterior se aprovado.
- Testes destrutivos (settle real, cobrança real) marcados como MANUAL e pulados se afetarem dados de produção.
- Erro `Missing SUPABASE_URL` visto no console pertence ao **published site** (`viax.lovable.app` — build antigo). Preview tem `.env` correto. Republicar resolve — incluído no plano de correção.
- Duração estimada: ~30–45 min de execução (Playwright + browser manual + relatório).

Aprove para eu iniciar a execução.
