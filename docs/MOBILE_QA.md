# Checklist QA mobile — ViaX

## Viewports de referência

| Dispositivo | Largura × altura |
|-------------|------------------|
| iPhone 13/14 | 390 × 844 |
| Android médio | 360 × 800 |
| Android grande | 412 × 915 |

No DevTools: modo responsivo ou `npx playwright test --project=mobile-chrome`.

## Critérios de aceite

- [ ] Sem scroll horizontal na **página** (`document.documentElement`)
- [ ] Títulos e CTAs principais visíveis sem zoom
- [ ] Botões e links com área de toque ≥ 44×44 px
- [ ] Modais/sheets cabem na viewport; conteúdo rolável internamente
- [ ] Bottom nav não cobre CTAs fixos (app autenticado usa `pb-24`)
- [ ] Tabelas admin: cards no mobile (`<md`); tabela só em `md+`

## Testes automatizados

```bash
npm run build
npm run test:e2e -- --project=mobile-chrome
```

Requer credenciais para rotas autenticadas:

```bash
PLAYWRIGHT_TEST_EMAIL=...
PLAYWRIGHT_TEST_PASSWORD=...
```

Admin/partner: usuário de teste precisa ter role correspondente ou os testes são ignorados (`test.skip`).

## Matriz de rotas (manual)

### Público

- `/` — landing, carrosséis, login modal (`?auth=login`)
- `/markets?status=live` — lista, filtros, busca
- `/markets/:id` — detalhe, OrderBox, tabs
- `/ranking`, `/live`, `/football`, `/urbanmind`
- `/auth/login` (redirect/modal)

### App (logado)

- `/dashboard`, `/wallet`, `/feed`, `/positions`
- `/settings`, `/profile`
- `/markets/create` — formulário comunitário

### Admin

- `/admin`, `/admin/risk`, `/admin/users`, `/admin/partners`
- `/admin/markets`, `/admin/bonuses`, `/admin/events`
- `/admin/traffic-events`, `/admin/sources`, `/admin/community`

### Partner

- `/partner`, `/partner/payouts` (se aplicável)

## Regressão desktop

Após alterações mobile, rodar também:

```bash
npm run test:e2e -- --project=chromium
```
