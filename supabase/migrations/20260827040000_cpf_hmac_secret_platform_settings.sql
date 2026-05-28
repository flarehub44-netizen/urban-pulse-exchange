-- F02 follow-up: read CPF HMAC secret from platform_settings (Supabase-compatible).
-- ALTER DATABASE SET app.cpf_hmac_secret is not permitted on hosted Supabase (42501).
--
-- Configure once via SQL Editor (service role / postgres), NOT via admin_update_setting:
--   insert into public.platform_settings (key, value)
--   values ('cpf_hmac_secret', to_jsonb('<64-char-random-secret>'::text))
--   on conflict (key) do update
--     set value = excluded.value,
--         updated_at = now();

create or replace function public.hash_cpf_document(p_document text)
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  v_secret text;
  v_digits text := public.normalize_cpf_digits(p_document);
begin
  if v_digits is null then
    return null;
  end if;

  select nullif(trim(coalesce(ps.value #>> '{}', '')), '')
  into v_secret
  from public.platform_settings ps
  where ps.key = 'cpf_hmac_secret';

  if v_secret is null then
    raise exception
      'cpf_hmac_secret_not_configured: '
      'set platform_settings key cpf_hmac_secret to a json string secret '
      '(e.g. to_jsonb(''<64-char-random>''::text)) via SQL Editor.';
  end if;

  return encode(
    extensions.hmac(
      convert_to(v_digits, 'UTF8'),
      convert_to(v_secret, 'UTF8'),
      'sha256'
    ),
    'hex'
  );
end;
$$;
