# Autenticação e hierarquia de usuários

## Papéis

| Papel                  | Armazenamento       | Acesso                                   |
| ---------------------- | ------------------- | ---------------------------------------- |
| **Trader**             | `profiles` (padrão) | App `/dashboard`, apostas, carteira      |
| **Afiliado (partner)** | `partner_accounts`  | Portal `/partner/*` após aprovação admin |
| **Admin**              | `profiles.is_admin` | `/admin/*` via convite ou allowlist      |

Papéis são **acumulativos**: um partner continua sendo trader; admin pode coexistir com trader.

## Fluxos

1. **Visitante** → navega em rotas públicas (`/markets`, `/live`, `/football/$id`) sem sessão.
2. **Cadastro formal** → modal `?auth=signup` ou `/auth/signup` (e-mail + senha).
3. **Login** → modal `?auth=login` ou `/auth/login` com `signInWithPassword`.
4. **Rotas `_app`** (`/dashboard`, `/profile`, …) → `requireAuth()` redireciona para login se não houver sessão.
5. **Partner** → candidatura em Configurações (exige e-mail confirmado) → aprovação em `/admin/partners`.
6. **Admin** → `claim_admin_invite` ou `try_sync_admin_allowlist` (painel visível só para e-mails na allowlist).

## Supabase Dashboard

- Habilitar **Email** provider e confirmação de e-mail.
- **Desabilitar Anonymous sign-ins** (modo anônimo removido do app).
- **Site URL** e **Redirect URLs**: `{origin}/auth/callback`, `{origin}/auth/verify`, `{origin}/auth/login`.
- Confirmação de e-mail e reset de senha devem apontar para `/auth/callback` (PKCE + `detectSessionInUrl` no client).

## RPC

- `get_my_account_context()` — contexto unificado para UI e guards.
- `is_user_registered()` — e-mail confirmado em `auth.users`.

## Scripts

```bash
npm run db:types   # regenerar types após migration
```

Migration: `supabase/migrations/20260705000000_account_hierarchy.sql`
