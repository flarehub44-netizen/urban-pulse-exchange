## ViaX — Plano da v1 (demo premium)

Plataforma de **prediction exchange parimutuel de inteligência urbana**, totalmente front-end, com dados mockados que pulsam em tempo real (intervals + animações Framer Motion) para simular uma bolsa viva. Sem autenticação, sem banco — tudo client-side via Zustand. Estética fintech dark, mistura Bloomberg + TradingView + Polymarket + Robinhood.

---

### 1. Design system (`src/styles.css`)
Dark fintech premium em `oklch`:
- `--background` grafite profundo `oklch(0.16 0.015 250)`
- `--surface` / `--card` levemente elevados com glassmorphism sutil
- `--primary` azul elétrico ViaX `oklch(0.68 0.20 250)`
- `--up` verde alta `oklch(0.74 0.18 150)`
- `--down` vermelho baixa `oklch(0.66 0.22 25)`
- `--warn` amarelo alerta `oklch(0.82 0.17 85)`
- `--muted-foreground` cinza azulado
- Gradientes: `--gradient-primary`, `--gradient-up`, `--gradient-down`, `--gradient-glow`
- Sombras com glow: `--shadow-glow-primary`, `--shadow-elevated`
- Fontes: **Inter** (UI) + **JetBrains Mono** (números/odds/tickers) via Google Fonts
- Keyframes: `pulse-glow`, `ticker-scroll`, `number-flicker`, `pool-grow`, `heatmap-pulse`, `fade-in-up`, `shimmer`

### 2. Rotas (TanStack Start, file-based)
```
src/routes/
  __root.tsx                 → shell + providers (QueryClient já existe)
  index.tsx                  → Landing page
  _app.tsx                   → Layout do app (sidebar + topbar + Outlet)
  _app/dashboard.tsx         → Home do terminal
  _app/markets.tsx           → Lista de mercados ao vivo
  _app/markets.$marketId.tsx → Detalhe do mercado (odds panel + parimutuel)
  _app/live.tsx              → Mapa realtime + eventos ativos
  _app/ranking.tsx           → Leaderboards
  _app/feed.tsx              → Feed social
  _app/urbanmind.tsx         → UrbanMind AI
  _app/wallet.tsx            → Carteira
  _app/profile.tsx           → Perfil
  sitemap[.]xml.ts + public/robots.txt
```

### 3. Landing page (`/`)
- **Nav** flutuante com glass, logo ViaX (mark custom SVG)
- **Hero**: título "Transforme movimento urbano em inteligência coletiva", subtítulo, 3 CTAs (Entrar Agora → /dashboard, Ver Mercados → /markets, Ver Ranking → /ranking). À direita, **mock de terminal vivo** com odds piscando, mini chart e pool crescendo
- **Ticker bar** horizontal com eventos rolando (`ticker-scroll`)
- **Como Funciona**: 4 passos com ícones Lucide e micro-animação
- **Prediction Exchange**: cards estilo Polymarket com SIM/NÃO e barras de pool animadas
- **IA vs Humanos**: gráfico de accuracy (Recharts) com duas linhas comparando UrbanMind vs comunidade
- **Mercados em Tempo Real**: grid de 6 cards conectados ao mesmo mock store
- **Rankings**: top 5 mini-tabela com avatares
- **Estatísticas globais**: contadores animados (volume 24h, mercados ativos, usuários, accuracy IA)
- **Mobile Experience**: mockup de telefone com cards swipe
- **Footer** minimalista

### 4. Layout do app (sidebar fintech)
- **Sidebar** colapsável (shadcn sidebar), 56–240px, ícones lucide, item ativo com barra azul + glow
- **Topbar**: saldo virtual animado, XP/divisão (badge), streak 🔥, volume diário, sino de notificações (popover com 5 notifs mock), avatar
- **Outlet** com fundo grafite e grid responsivo

### 5. Dashboard (`/dashboard`)
Grid estilo Bloomberg:
- KPIs topo (saldo, lucro 24h, accuracy, ranking)
- Painel "Mercados em alta" (4 cards)
- Mini-mapa de SP com heatmap (link para /live)
- Chart de PnL pessoal (Recharts area)
- UrbanMind callout com previsão atual
- Feed compacto (últimas 5)

### 6. Mercados (`/markets` e detalhe)
- **Lista**: filtros (Todos / Ao vivo / Encerrando / Resolvidos), busca, cards Polymarket-style com:
  - Pergunta + região + tempo restante (countdown)
  - Pool SIM (verde) / Pool NÃO (vermelho) em barra dividida animada
  - Probabilidades (%), volume total, participantes, mini sparkline
  - Botões SIM/NÃO
- **Detalhe** (`/markets/:id`): layout TradingView
  - Header com pergunta, status, time left
  - **Painel de odds**: chart de probabilidade ao longo do tempo (Recharts line/area) + volume bars + candles mockados
  - **Order box** (parimutuel): input de valor, escolha SIM/NÃO, mostra payout potencial, ROI estimado, % de participação no pool, "Prize Pool" (90% do total)
  - **Book social**: últimas previsões dos usuários rolando
  - **UrbanMind insight**: previsão da IA + confiança
  - **Comentários** abaixo

### 7. Engine Parimutuel (visual, client-side)
`src/lib/parimutuel.ts`:
```ts
prob(side) = pool[side] / poolTotal
prizePool = poolTotal * 0.9
payout(stake, side) = stake + (stake / pool[side]) * pool[other] * 0.9
roi = (payout - stake) / stake
```
Nunca mostrar "taxa" — só **Prize Pool** e **Pool Distribuível**. Store Zustand atualiza pools a cada 1.5s com micro-flutuações.

### 8. Mapa realtime (`/live`)
Mapa SVG estilizado de São Paulo (silhueta de bairros simplificada + ruas principais como Paulista, Marginal, Faria Lima, 23 de Maio):
- Heatmap por região (verde/amarelo/vermelho) que recalcula a cada 2s
- **Pulsos** circulares animados em pontos de evento ativo
- Tooltip ao hover com fluxo/velocidade média
- Sidebar de eventos ativos com link para o mercado

### 9. Ranking (`/ranking`)
- Tabs: Global / Cidade / Bairro / Amigos
- Tabela esports: posição, avatar, nome, divisão (badge colorida), accuracy, ROI, streak, volume, crescimento semanal (seta verde/vermelha)
- Top 3 em destaque com cards grandes

### 10. Feed social (`/feed`)
- Feed estilo Twitter: avatar, handle, verificado, conteúdo, tags de mercado, likes, comentários, reposts
- Composer no topo
- Mistura: análises, alertas (acidente, chuva), previsões

### 11. UrbanMind AI (`/urbanmind`)
- Hero com "previsão atual" gigante e barra de confiança
- Gráfico IA vs Humanos (accuracy histórica)
- Lista de previsões ativas da IA
- Histórico com hits/misses

### 12. Carteira (`/wallet`)
- Saldo grande animado (R$ virtual)
- Tabs: Visão geral / Histórico / Depositar (CTA mock) / Sacar (CTA mock)
- Chart de evolução do saldo
- Lista de transações (entrada em pool, payout, depósito, saque)
- KPIs: ROI total, volume movimentado, lucro mensal

### 13. Perfil (`/profile`)
- Avatar grande, nome, divisão, XP bar
- Grid de badges (Mestre da Paulista, Rei do Rush, etc.) com lock/unlock
- Calendário de atividade estilo GitHub
- Chart de PnL
- Mercados favoritos

### 14. Gamificação e notificações
- Divisões: Bronze → Elite com cores próprias
- Toast (`sonner`) para wins/streaks com confete (`canvas-confetti`) — som **desabilitado por padrão**
- Notification popover na topbar com 5 exemplos mockados

### 15. Realtime (mock store Zustand)
`src/store/marketStore.ts` — fonte única para mercados, pools, odds, feed, ranking, mapa. Hooks de intervalo (`useEffect` + `setInterval`) emitem updates pseudo-aleatórios (random walk) para todos os componentes consumirem. Números animam com Framer Motion `animate` + componente `<AnimatedNumber/>`.

### 16. Mobile
- Sidebar vira drawer + **bottom nav** (Home, Mercados, Live, Ranking, Perfil)
- Cards full-width, swipe horizontal em listas com `embla` (já incluído via carousel)
- Topbar compacta com saldo + sino

---

### Detalhes técnicos
- **Stack real**: TanStack Start (não Next 15 — é o stack do projeto), TypeScript, Tailwind v4, shadcn/ui, **Framer Motion** (`motion`), **Recharts**, **Zustand**, **canvas-confetti**, **embla-carousel** (já presente). Sem Socket.io nesta v1 — realtime é simulado com intervals.
- **Sem Supabase nesta v1** (escolha do escopo "demo sem auth"). Schema parimutuel fica documentado em `src/lib/parimutuel.ts` para futura migração.
- **Sem mapa geográfico real** — SVG custom de SP.
- **SEO**: `head()` único por rota, sitemap.xml + robots.txt.
- **Componentes novos**: `AnimatedNumber`, `LivePool`, `OddsChart`, `MarketCard`, `Ticker`, `Heatmap`, `Sidebar`, `Topbar`, `BottomNav`, `RankingTable`, `FeedItem`, `UrbanMindCard`, `BadgeChip`, `DivisionBadge`, `OrderBox`.
- **Imagens**: avatares gerados (4–6) + hero abstrato urbano via `imagegen` em `src/assets/`.

### Fora do escopo da v1 (próximas iterações)
- Auth + Supabase schema real (events, pools, predictions, wallets, xp_history, etc.)
- Stripe / pagamento real
- Mapbox geográfico
- WebSockets reais
- Integração YOLO/OpenCV para contagem real
