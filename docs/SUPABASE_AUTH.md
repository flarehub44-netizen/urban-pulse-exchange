# Supabase Auth — projeto `rzhffxiicufqcabmhscq`

Autenticação exclusivamente por **e-mail e senha** (`signUpWithEmail` / `signInWithPassword`).

## Configuração no Dashboard

1. Abra [Supabase Dashboard → Auth → Providers](https://supabase.com/dashboard/project/rzhffxiicufqcabmhscq/auth/providers)
2. Em **Email**:
   - Ative **Enable Email provider**
   - Habilite **signups** com e-mail/senha
3. Em **[URL Configuration](https://supabase.com/dashboard/project/rzhffxiicufqcabmhscq/auth/url-configuration)**:
   - **Site URL**: `https://viax-urban-pulse.douglaspinheirosantos94.workers.dev`
   - **Redirect URLs**:
     - `https://viax-urban-pulse.douglaspinheirosantos94.workers.dev/**`
     - `https://tanstack-start-app.douglaspinheirosantos94.workers.dev/**` (apenas legado, redirecionado)

## Fluxo no app

- **Cadastro**: modal `?auth=signup` ou `/auth/signup`
- **Login**: modal `?auth=login` ou `/auth/login`
- **Callback**: `/auth/callback` (PKCE + confirmação de e-mail)
- **Rotas protegidas** (`/_app/*`): exigem cadastro confirmado via `requireRegistered()`

## Erros comuns

| Código / mensagem | Causa | Ação |
|---|---|---|
| Signup falha com e-mail vazio | Formulário enviado sem e-mail válido | Preencher e-mail e senha (≥ 6 caracteres) |
| `signup_disabled` | Signups desativados no projeto | Habilitar em Auth → Providers → Email |
| Redirect após confirmação falha | URL do Worker ausente | Adicionar domínio em URL Configuration |
