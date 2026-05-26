# Governança SQL — grants, SECURITY DEFINER e RLS

## Objetivo

Manter funções e tabelas do Supabase seguras por padrão, com validação contínua em PRs e testes SQL.

## Checklist obrigatório para novas migrations

1. **Grants explícitos**
   - Evitar `PUBLIC`.
   - Declarar `GRANT EXECUTE` apenas para papéis necessários (`anon`, `authenticated`, `service_role`).
2. **SECURITY DEFINER**
   - Funções privilegiadas devem definir `SET search_path = public, pg_temp` (ou schema privado equivalente).
   - Não criar função privilegiada em schema exposto sem necessidade.
3. **RLS**
   - `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` em toda nova tabela exposta.
   - Criar políticas mínimas por ação (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) sem wildcard de permissões.
4. **Testabilidade**
   - Incluir teste em `supabase/tests/` para policy/grant sensível.
5. **Revisão de performance**
   - Para consultas quentes, validar índice e plano (`EXPLAIN`) antes do merge.

## Inventário mínimo por release

- Funções executáveis por `anon` e `authenticated`.
- Funções `SECURITY DEFINER` sem `search_path` explícita.
- Tabelas em schema exposto sem RLS habilitada.

## Arquivos de apoio

- `supabase/tests/security_anon_functions_inventory.sql`
- `supabase/tests/security_definer_search_path_inventory.sql`
- `docs/SECURITY.md`
