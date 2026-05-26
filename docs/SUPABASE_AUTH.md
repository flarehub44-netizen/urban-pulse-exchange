# Supabase Auth — projeto `rzhffxiicufqcabmhscq`

## Erro `422 anonymous_provider_disabled` em `/auth/v1/signup`

O Supabase retorna este código quando o **provider Anonymous** está desabilitado, mas alguma requisição de signup/login tenta usá-lo.

### O que fazer no Dashboard

1. Abra [Supabase Dashboard](https://supabase.com/dashboard/project/rzhffxiicufqcabmhscq/auth/providers)
2. Em **Email**: confirme que **Enable Email provider** está ativo
3. Em **Sign ups / Sign in**:
   - Habilite **Email** (cadastro com e-mail/senha)
   - Se o app ainda falhar, habilite temporariamente **Anonymous sign-ins** apenas para diagnóstico (não é o fluxo principal do ViaX)
4. Em **URL Configuration**, adicione o domínio do Worker em produção:
   - `https://tanstack-start-app.douglaspinheirosantos94.workers.dev`
   - `https://viax-urban-pulse.douglaspinheirosantos94.workers.dev` (se usar custom domain)

### Fluxo esperado no app

- Cadastro: modal **signup** via `signUpWithEmail` (e-mail/senha), não login anônimo
- Após login: `AppShell` com Realtime (`useSupabaseRealtime`) para eventos ao vivo
