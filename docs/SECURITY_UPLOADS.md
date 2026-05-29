# Segurança de uploads (ViaX)

## Superfície atual

| Fluxo | Bucket | Tipos | Tamanho |
|-------|--------|-------|---------|
| Capa de mercado da comunidade | `community-covers` (público) | JPEG, PNG, WebP | 2 MB |

Código: `src/lib/community-cover-upload.ts`, `src/lib/image-upload-guard.ts`, formulário em `src/components/viax/community-market-create-form.tsx`.

Não há upload de avatar, KYC ou documentos no app hoje.

## Controles por camada

### Cliente (`image-upload-guard.ts`)

- Whitelist de MIME e tamanho máximo.
- Validação de **magic bytes** (assinatura do arquivo, não só `File.type`).
- Limite de dimensão (4096×4096).
- **Re-encode via canvas** antes do envio (remove EXIF e bytes extras; falha se não for imagem decodificável).

### Supabase Storage

- `file_size_limit` e `allowed_mime_types` no bucket (`20260715000000_community_cover_and_ends.sql`).
- RLS: `insert`/`update`/`delete` apenas em `community-covers/{auth.uid()}/...`.

### Postgres (RPC)

- `create_community_market` valida `cover_url` com regex: só URLs públicas do bucket na pasta do usuário autenticado.

### CSP

- `img-src` em `src/server.ts` permite `https://*.supabase.co` para exibir capas.

## O que evitar no futuro

- Confiar apenas em `file.type` ou extensão do nome do arquivo.
- Bucket **público** com SVG, HTML, PDF ou scripts.
- Aceitar `cover_url` arbitrária sem validação no servidor.

## Extensão futura (KYC / documentos)

- Bucket **privado** + políticas RLS restritas.
- Validação server-side (Edge Function) com magic bytes e antivírus se necessário.
- Nunca servir upload do usuário com `Content-Type` executável no mesmo domínio do app.

## Checklist manual (regressão)

1. **Legítimo:** PNG/JPEG/WebP &lt; 2 MB → mercado criado, capa visível na listagem.
2. **Polyglot:** arquivo não-imagem renomeado para `.jpg` → toast de conteúdo inválido, sem objeto no storage.
3. **Dimensão:** imagem &gt; 4096 px em um lado → toast de dimensão máxima.
4. **URL forjada:** RPC com `cover_url` de outro usuário → `invalid_cover_url` (SQL).
5. **RLS:** usuário A não grava em pasta de B (teste via API autenticada, se necessário).

## Testes automatizados

- `src/lib/image-upload-guard.test.ts` — magic bytes e limites de cliente.
- E2E leve: `e2e/community-markets.spec.ts` (formulário de criar mercado).
