
-- Tabela de upstreams de câmeras
create table if not exists public.camera_upstreams (
  slug text primary key,
  provider text not null check (provider in ('der-sp','cet-sp','motiva','custom')),
  kind text not null default 'hls' check (kind in ('hls','image')),
  upstream_url text not null,
  allowed_hosts text[] not null,
  headers jsonb not null default '{}'::jsonb,
  label text,
  created_by uuid,
  created_at timestamptz not null default now()
);

alter table public.camera_upstreams enable row level security;

-- Deny-all (só service_role acessa)
drop policy if exists camera_upstreams_deny_all on public.camera_upstreams;
create policy camera_upstreams_deny_all
  on public.camera_upstreams
  as permissive
  for all
  to authenticated, anon
  using (false)
  with check (false);

-- Função usada pelo proxy (executada com service role; security definer apenas para acesso ao schema)
create or replace function public.get_camera_upstream(p_slug text)
returns table(
  slug text,
  provider text,
  kind text,
  upstream_url text,
  allowed_hosts text[],
  headers jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select cu.slug, cu.provider, cu.kind, cu.upstream_url, cu.allowed_hosts, cu.headers
  from public.camera_upstreams cu
  where cu.slug = p_slug
$$;

revoke all on function public.get_camera_upstream(text) from public;
grant execute on function public.get_camera_upstream(text) to service_role;

-- Criar/atualizar upstream (admin)
create or replace function public.admin_create_camera_upstream(
  p_provider text,
  p_upstream_url text,
  p_label text default null,
  p_kind text default 'hls'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_host text;
  v_allowed_hosts text[];
  v_headers jsonb;
  v_slug text;
  v_hash text;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;
  select coalesce(is_admin, false) into v_is_admin from public.profiles where id = v_uid;
  if not coalesce(v_is_admin, false) then
    raise exception 'Apenas administradores';
  end if;

  if p_provider not in ('der-sp','cet-sp','motiva','custom') then
    raise exception 'Provedor inválido: %', p_provider;
  end if;
  if p_kind not in ('hls','image') then
    raise exception 'Tipo inválido: %', p_kind;
  end if;
  if p_upstream_url !~* '^https?://' then
    raise exception 'URL deve começar com http(s)://';
  end if;

  -- Extrai host
  v_host := lower(regexp_replace(p_upstream_url, '^https?://([^/]+).*$', '\1'));

  -- Presets de provedor
  if p_provider = 'der-sp' then
    if v_host !~* '\.nip\.io$' then
      raise exception 'DER-SP exige host *.nip.io (recebido: %)', v_host;
    end if;
    v_allowed_hosts := array[v_host];
    v_headers := '{"Referer":"https://www.der.sp.gov.br/","User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"}'::jsonb;
  elsif p_provider = 'cet-sp' then
    if v_host not in ('cameras.cetsp.com.br','cetsp.com.br','www.cetsp.com.br') then
      raise exception 'CET-SP exige host cameras.cetsp.com.br';
    end if;
    v_allowed_hosts := array[v_host];
    v_headers := '{"Referer":"https://cameras.cetsp.com.br/","User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36","Accept":"image/avif,image/webp,image/apng,image/*,*/*;q=0.8"}'::jsonb;
  elsif p_provider = 'motiva' then
    if v_host !~* '\.cloudfront\.net$' then
      raise exception 'Motiva exige host *.cloudfront.net';
    end if;
    v_allowed_hosts := array[v_host];
    v_headers := '{"Origin":"https://rodovias.motiva.com.br","Referer":"https://rodovias.motiva.com.br/","User-Agent":"Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1"}'::jsonb;
  else
    v_allowed_hosts := array[v_host];
    v_headers := '{}'::jsonb;
  end if;

  -- Slug estável baseado em hash da URL
  v_hash := substr(encode(digest(p_upstream_url, 'sha256'), 'hex'), 1, 10);
  v_slug := p_provider || '-' || v_hash;

  insert into public.camera_upstreams (slug, provider, kind, upstream_url, allowed_hosts, headers, label, created_by)
  values (v_slug, p_provider, p_kind, p_upstream_url, v_allowed_hosts, v_headers, p_label, v_uid)
  on conflict (slug) do update set
    upstream_url = excluded.upstream_url,
    allowed_hosts = excluded.allowed_hosts,
    headers = excluded.headers,
    label = coalesce(excluded.label, public.camera_upstreams.label);

  return jsonb_build_object(
    'slug', v_slug,
    'proxy_path', case when p_kind = 'image'
      then '/api/public/snapshot-proxy/' || v_slug || '/frame.jpg'
      else '/api/public/hls-proxy/' || v_slug || '/index.m3u8'
    end
  );
end
$$;

revoke all on function public.admin_create_camera_upstream(text,text,text,text) from public;
grant execute on function public.admin_create_camera_upstream(text,text,text,text) to authenticated;

-- Seed: entradas atuais do código
-- Motiva
insert into public.camera_upstreams (slug, provider, kind, upstream_url, allowed_hosts, headers, label)
values (
  'motiva-br116-km225',
  'motiva',
  'hls',
  'https://d3b8201cy0qzzb.cloudfront.net/out/v1/4bd31ad7560846e08093f9552f92a8d0/CMAF_HLS/index_1.m3u8',
  array['d3b8201cy0qzzb.cloudfront.net'],
  '{"Origin":"https://rodovias.motiva.com.br","Referer":"https://rodovias.motiva.com.br/","User-Agent":"Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1"}'::jsonb,
  'BR-116 km 225'
) on conflict (slug) do nothing;

-- CET-SP Paulista (snapshot)
insert into public.camera_upstreams (slug, provider, kind, upstream_url, allowed_hosts, headers, label)
values (
  'cetsp-paulista',
  'cet-sp',
  'image',
  'https://cameras.cetsp.com.br/Cams/23/2.jpg',
  array['cameras.cetsp.com.br'],
  '{"Referer":"https://cameras.cetsp.com.br/","User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36","Accept":"image/avif,image/webp,image/apng,image/*,*/*;q=0.8"}'::jsonb,
  'Av. Paulista'
) on conflict (slug) do nothing;

-- DER-SP (10 câmeras)
insert into public.camera_upstreams (slug, provider, kind, upstream_url, allowed_hosts, headers, label)
select
  'der-sp-' || lower(s.code),
  'der-sp',
  'hls',
  'https://34.104.32.249.nip.io/' || s.code || '/stream.m3u8',
  array['34.104.32.249.nip.io'],
  '{"Referer":"https://www.der.sp.gov.br/","User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"}'::jsonb,
  s.label
from (values
  ('SP055-KM073','SP-055 km 73'),
  ('SP055-KM083','SP-055 km 83'),
  ('SP055-KM110','SP-055 km 110'),
  ('SP055-KM168','SP-055 km 168'),
  ('SP055-KM193','SP-055 km 193'),
  ('SP055-KM211','SP-055 km 211'),
  ('SP125-KM042','SP-125 km 42'),
  ('SP125-KM067','SP-125 km 67'),
  ('SP125-KM088','SP-125 km 88'),
  ('SP123-KM008','SP-123 km 8')
) as s(code, label)
on conflict (slug) do nothing;
