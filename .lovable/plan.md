## Plano de Ajuste — Correções Pós-QA

Foco: eliminar os bloqueadores P0 (mercados não aparecem, site publicado quebrado, hidratação) e mitigar P1 (segurança DB, acessibilidade). Sem mudanças de escopo de produto.

---

### Fase 1 — P0: Listagem de mercados (dashboard + /markets)

**Problema:** `useMarkets` usa `enabled: isBrowser`, gerando mismatch SSR×CSR e árvore descartada. Resultado: "0 mercados" mesmo com dados no banco.

**Ações:**
1. Em `src/hooks/use-markets.ts`: remover o guard `enabled: isBrowser`. Deixar a query rodar no SSR e no cliente (dados são públicos, sem auth).
2. Garantir que o `queryKey` é estável entre servidor e cliente (sem `Date.now()`, `Math.random()`, `window.*`).
3. Em `src/routes/markets.tsx` e no dashboard: remover qualquer branch `if (typeof window !== 'undefined')` que renderize markup diferente; usar classes responsivas Tailwind (`hidden md:grid` / `grid md:hidden`) para alternar layout mobile/desktop sem condicional JS.
4. Pré-buscar no loader via `context.queryClient.ensureQueryData(marketsQueryOptions)` e consumir com `useSuspenseQuery` para render imediato e SSR-safe.

**Validação:** abrir `/markets?status=live` e `/dashboard` → contagem > 0; sem warning de hydration no console.

---

### Fase 2 — P0: Site publicado sem variáveis Supabase

**Problema:** `viax.lovable.app` retorna `Missing SUPABASE_URL`. Build publicado antigo, sem env.

**Ações:**
1. Confirmar que `.env` da preview contém `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
2. Republicar o projeto (botão Publish → Update) para propagar env vars ao runtime do Worker.
3. Após deploy, smoke test em `/`, `/markets`, `/dashboard` no domínio publicado.

---

### Fase 3 — P0: Hydration mismatches residuais

**Ações:**
1. Auditar componentes que usam `useEffect` + `useState(false)` para "is mounted" e renderizam markup diferente — substituir por CSS responsivo.
2. Remover usos de `window`, `localStorage`, `navigator` no render inicial; mover para `useEffect`.
3. Conferir `src/routes/_app.tsx` e `__root.tsx` para skeleton/guards que dependam de auth não-determinística.

**Validação:** console limpo de `Hydration failed` / `did not match` em todas as rotas públicas.

---

### Fase 4 — P1: Acessibilidade (Radix Dialog)

**Ações:**
1. Adicionar `<DialogTitle>` (visível ou via `VisuallyHidden`) em:
   - Modal de onboarding
   - Modal de confirmação de aposta
   - Quaisquer outros `DialogContent` flagados no console
2. Adicionar `DialogDescription` quando aplicável.

---

### Fase 5 — P1: Segurança Supabase (linter)

**Ações:**
1. Recriar a view com `SECURITY DEFINER` como `SECURITY INVOKER` (ou remover se desnecessária).
2. Em todas as funções flagadas: adicionar `SET search_path = public` no `CREATE OR REPLACE FUNCTION`.
3. Rodar `supabase--linter` novamente até zerar erros e reduzir warnings críticos.

Migração única consolidando todos os fixes de função/view.

---

### Fase 6 — Validação final

1. `bunx vitest run` (esperado: 40/40 verde).
2. Navegação manual: `/`, `/markets`, `/markets/:id`, `/dashboard`, `/wallet`, `/social`, login → bet flow.
3. `supabase--linter`: zero ERRORs.
4. Console: zero hydration errors, zero Radix warnings.
5. Atualizar `/mnt/documents/QA_REPORT_2026-05-22.md` com status pós-fix.

---

### Fora de escopo

- Refatorações maiores de arquitetura
- Novas features
- Mudanças de design
- Otimizações de performance além das que removem mismatches

### Ordem de execução

Fase 1 → 3 → 4 → 5 → 2 (republish por último, após código estável) → 6.
