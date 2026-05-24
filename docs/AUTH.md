# Autenticação e hierarquia de usuários

## Papéis

| Papel | Armazenamento | Acesso |
|-------|---------------|--------|
| **Trader** | `profiles` (padrão) | App `/dashboard`, apostas, carteira |
| **Afiliado (partner)** | `partner_accounts` | Portal `/partner/*` após aprovação admin |
| **Admin** | `profiles.is_admin` | `/admin/*` via convite ou allowlist |

Papéis são **acumulativos**: um partner continua sendo trader; admin pode coexistir com trader.

## Fluxos

1. **Visitante** → `signInAnonymously()` no primeiro acesso à área `_app`.
2. **Cadastro formal** → `/auth/signup` (e-mail + senha). Se já houver sessão anon, `updateUser` preserva o `user_id`.
3. **Login** → `/auth/login` com `signInWithPassword`.
4. **Upgrade** → `/auth/signup?upgrade=1` para contas anon.
5. **Partner** → candidatura em Configurações (exige e-mail confirmado) → aprovação em `/admin/partners`.
6. **Admin** → `claim_admin_invite` ou `try_sync_admin_allowlist` (painel visível só para e-mails na allowlist).

## Supabase Dashboard

- Habilitar **Email** provider e confirmação de e-mail.
- Habilitar **Anonymous sign-ins** para o boot automático.
- Redirect URLs: `{origin}/auth/verify`, `{origin}/auth/login`.

## RPC

- `get_my_account_context()` — contexto unificado para UI e guards.
- `is_user_registered()` — e-mail confirmado em `auth.users`.

## Scripts

```bash
npm run db:types   # regenerar types após migration
```

Migration: `supabase/migrations/20260705000000_account_hierarchy.sql`
