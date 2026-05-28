-- Security hardening: CPF HMAC hash + UrbanMind feature gate + AI rate limit
-- Fixes:
--   V05 — hash_cpf_document uses plain SHA256 (rainbow table attack)
--   V10 — get_urbanmind_digest accessible via REST even when UI feature is disabled
--   V17 — get_urbanmind_digest has no rate limit (AI cost abuse)

-- ---------------------------------------------------------------------------
-- V05: CPF document hash — switch from SHA256 to HMAC-SHA256
--
-- Requires setting app.cpf_hmac_secret on the database:
--   ALTER DATABASE postgres SET app.cpf_hmac_secret = '<random-64-char-secret>';
--   (Run in Supabase SQL editor as superuser)
--
-- Existing cpf_hash values in user_payment_identities used plain SHA256.
-- New records will use HMAC. Old records remain valid for lookup until they
-- are naturally refreshed on the next deposit by the same user.
-- ---------------------------------------------------------------------------
create or replace function public.hash_cpf_document(p_document text)
returns text
language sql
stable  -- was immutable; current_setting() requires at least stable
set search_path = public
as $$
  select case
    when public.normalize_cpf_digits(p_document) is null then null
    else encode(
      extensions.hmac(
        convert_to(public.normalize_cpf_digits(p_document), 'UTF8'),
        convert_to(
          coalesce(
            nullif(current_setting('app.cpf_hmac_secret', true), ''),
            'viax-cpf-sha256-fallback'
          ),
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    )
  end;
$$;

-- ---------------------------------------------------------------------------
-- V10 + V17: get_urbanmind_digest — feature gate + per-user rate limit
-- ---------------------------------------------------------------------------
create or replace function public.get_urbanmind_digest()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id     uuid := auth.uid();
  v_profile     profiles%rowtype;
  v_mem         user_ai_memory%rowtype;
  v_archetype   jsonb;
  v_market      markets%rowtype;
  v_rate        numeric;
  v_line        text;
  v_name        text;
  v_enabled     boolean;
  v_rl          jsonb;
begin
  if v_user_id is null then return '{}'::jsonb; end if;

  -- V10: server-side feature gate (mirrors URBANMIND_UI_ENABLED frontend flag)
  select coalesce((value)::boolean, true)
    into v_enabled
  from public.platform_settings
  where key = 'urbanmind_enabled';

  if coalesce(v_enabled, true) = false then
    raise exception 'feature_disabled: urbanmind';
  end if;

  -- V17: per-user rate limit — max 30 calls/hour to control AI costs
  select public.service_assert_rate_limit(
    'urbanmind:' || v_user_id::text,
    30,
    3600
  ) into v_rl;
  if coalesce((v_rl->>'limited')::boolean, false) then
    raise exception 'rate_limit_exceeded: urbanmind digest';
  end if;

  select * into v_profile from public.profiles where id = v_user_id;
  select * into v_mem from public.user_ai_memory where user_id = v_user_id;

  v_name := split_part(v_profile.name, ' ', 1);

  if v_mem.bets_vs_ai > 0 then
    v_rate := round((v_mem.wins_vs_ai::numeric / v_mem.bets_vs_ai) * 100, 0);
  end if;

  if v_mem.last_market_id is not null then
    select * into v_market from public.markets where id = v_mem.last_market_id;
  end if;

  v_line := case
    when v_mem.best_accuracy_region is not null and v_rate >= 60 then
      v_name || ', sua acurácia em ' || v_mem.best_accuracy_region || ' é excepcional. Tem mercado aberto lá agora.'
    when v_mem.worst_accuracy_region is not null and v_mem.total_bets > 10 then
      'Dica: ' || v_name || ' evite mercados em ' || v_mem.worst_accuracy_region || ' por enquanto — acurácia baixa lá. Foque em ' || coalesce(v_mem.best_accuracy_region, 'sua região forte') || '.'
    when v_rate >= 50 then
      'Quando você discorda da UrbanMind, acerta ' || v_rate::text || '% das vezes. Use isso no próximo mercado.'
    when v_mem.favorite_category is not null then
      'Sua categoria mais forte é ' || v_mem.favorite_category || '. A IA sugere olhar mercados desta categoria hoje.'
    when v_mem.total_bets > 0 then
      v_name || ', você já fez ' || v_mem.total_bets::text || ' palpites. Hoje a IA recomenda mercados de ' || coalesce(nullif(trim(v_profile.neighborhood), ''), v_profile.city) || '.'
    else
      'Comece com um mercado ao vivo na sua região — a UrbanMind mostra onde a cidade e você divergem.'
  end;

  return jsonb_build_object(
    'headline',              'Pulso UrbanMind · ' || coalesce(nullif(trim(v_profile.neighborhood), ''), v_profile.city),
    'body',                  v_line,
    'wins_vs_ai',            coalesce(v_mem.wins_vs_ai, 0),
    'bets_vs_ai',            coalesce(v_mem.bets_vs_ai, 0),
    'last_market_id',        v_mem.last_market_id,
    'last_side',             v_mem.last_side,
    'favorite_region',       v_mem.favorite_region,
    'best_accuracy_region',  v_mem.best_accuracy_region,
    'worst_accuracy_region', v_mem.worst_accuracy_region,
    'favorite_category',     v_mem.favorite_category,
    'avg_stake',             v_mem.avg_stake
  );
end;
$$;

-- Seed feature flag (off by default, matching URBANMIND_UI_ENABLED = false)
insert into public.platform_settings (key, value)
values ('urbanmind_enabled', 'false'::jsonb)
on conflict (key) do nothing;
