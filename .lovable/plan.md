# Cadastro de câmera por provedor

Hoje toda câmera precisa ter slug pré-registrado em `src/lib/hls-upstream-map.ts` (allowlist hardcoded). Para escalar, o admin precisa cadastrar URLs novas sem editar código.

## Ideia

Em `/admin/sources`, ao adicionar câmera o admin escolhe:

- **Provedor**: `DER-SP`, `CET-SP`, `Motiva` (ou `Custom`)
- **URL upstream** (HLS `.m3u8` ou snapshot HTTP)
- Nome / região / linha de contagem (como hoje)

O sistema:

1. Valida que a URL casa com o host esperado do provedor (ex.: DER-SP só aceita `*.nip.io`, Motiva só `*.cloudfront.net`).
2. Gera um slug estável (`der-sp-<hash>`, `cet-<hash>`, `motiva-<hash>`) e grava em `cameras.stream_url` o endpoint do proxy (`/api/public/hls-proxy/<slug>/stream.m3u8`).
3. Persiste o mapeamento `slug → { upstream_url, provider, headers }` numa nova tabela `camera_upstreams` (substitui o map estático).
4. O proxy `/api/public/hls-proxy/$.ts` passa a consultar essa tabela em vez do objeto em memória, injetando os headers (`Referer`, `Origin`, `User-Agent`) do preset do provedor.

## Presets de provedor (server-side)

Arquivo `src/lib/camera-providers.ts`:

| Provider | Host permitido                         | Headers injetados                                      |
| -------- | -------------------------------------- | ------------------------------------------------------ |
| `der-sp` | `*.nip.io`                             | `Referer: https://www.der.sp.gov.br/`                  |
| `cet-sp` | `cameras.cetsp.com.br`, `cetsp.com.br` | `Referer: https://www.cetsp.com.br/`                   |
| `motiva` | `*.cloudfront.net`                     | `Referer: https://rodovias.motiva.com.br/` + UA mobile |
| `custom` | qualquer HTTPS                         | sem headers extras (usa default)                       |

## Mudanças

### Banco (migration)

```sql
create table camera_upstreams (
  slug text primary key,
  provider text not null check (provider in ('der-sp','cet-sp','motiva','custom')),
  upstream_url text not null,
  allowed_hosts text[] not null,
  headers jsonb not null default '{}',
  created_by uuid,
  created_at timestamptz default now()
);
-- RLS: deny_all (só service_role escreve via server fn admin-guarded)
```

Seed: migra as 11 entradas atuais do `HLS_UPSTREAM_MAP` para essa tabela.

### Server functions

- `admin-create-camera-upstream.functions.ts` (protegida por admin) — valida URL contra preset, insere em `camera_upstreams`, retorna slug.
- Proxy `hls-proxy/$.ts` lê de `camera_upstreams` (via `supabaseAdmin`) em vez do map estático. Cache em memória do Worker para evitar 1 query por segmento.

### Frontend `/admin/sources`

Adicionar antes do campo URL:

- `<select>` Provedor (DER-SP / CET-SP / Motiva / Custom)
- Placeholder da URL muda conforme provedor
- Validação client-side espelha o host allowlist
- Ao salvar: chama `createCameraUpstream({ provider, upstreamUrl, ...camera })` → recebe slug → grava `cameras.stream_url = /api/public/hls-proxy/<slug>/stream.m3u8`

## Trade-offs

- **Prós**: admin cadastra qualquer câmera DER/CET/Motiva sem deploy. Mesma lógica serve snapshot proxy.
- **Contra**: 1 query extra por playlist (mitigado com cache em memória do Worker, TTL 60s).
- **Segurança**: allowlist por provedor evita SSRF. Só admin cria. RLS bloqueia leitura pública da tabela.

## Fora do escopo

- UI de edição/exclusão de upstreams (fica para depois — por enquanto só create + listar via tabela `cameras`).
- CET-SP real (precisa confirmar formato de URL pública deles).
