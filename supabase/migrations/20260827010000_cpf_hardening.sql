-- Semana 2 / F02 + F04:
--
-- F02: Remove hardcoded HMAC fallback 'viax-cpf-sha256-fallback' from
--      hash_cpf_document. The key was publicly visible in this repository,
--      making CPF hashes in user_payment_identities trivially reversible via
--      rainbow table if the database were leaked.
--      Now the function raises a clear error if app.cpf_hmac_secret is missing.
--      How to configure:
--        ALTER DATABASE postgres SET app.cpf_hmac_secret = '<64-char-random>';
--      (Run in Supabase SQL Editor as superuser, then restart.)
--
-- F04 (partial): Add cpf + phone to the column guard trigger so that
--      authenticated clients cannot update these fields directly — only
--      SECURITY DEFINER RPCs (update_profile_cpf) may write them.
--      Also adds mask_cpf() helper for safe display in UI contexts.

-- ---------------------------------------------------------------------------
-- F02: hash_cpf_document — fail hard if secret not configured
-- ---------------------------------------------------------------------------
create or replace function public.hash_cpf_document(p_document text)
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  v_secret text := nullif(current_setting('app.cpf_hmac_secret', true), '');
  v_digits text := public.normalize_cpf_digits(p_document);
begin
  if v_digits is null then
    return null;
  end if;
  if v_secret is null then
    raise exception
      'cpf_hmac_secret_not_configured: '
      'execute ALTER DATABASE postgres SET app.cpf_hmac_secret = ''<64-char-secret>''; '
      'as superuser, then reload the database.';
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

-- ---------------------------------------------------------------------------
-- mask_cpf: safe display helper — shows first 3 and last 2 digits only.
-- Example: '12345678901' → '123.***.***-01'
-- ---------------------------------------------------------------------------
create or replace function public.mask_cpf(p_cpf text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when public.normalize_cpf_digits(p_cpf) is null then null
    else left(public.normalize_cpf_digits(p_cpf), 3)
         || '.***.***-'
         || right(public.normalize_cpf_digits(p_cpf), 2)
  end;
$$;

grant execute on function public.mask_cpf(text) to authenticated;

-- ---------------------------------------------------------------------------
-- F04: extend the column guard to protect cpf + phone
-- ---------------------------------------------------------------------------
create or replace function public.guard_profiles_sensitive_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('role', true) in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if new.is_admin is distinct from old.is_admin then
      raise exception 'Cannot modify is_admin';
    end if;
    if new.balance is distinct from old.balance then
      raise exception 'Cannot modify balance directly; use platform RPCs';
    end if;
    if new.xp is distinct from old.xp
       or new.xp_to_next is distinct from old.xp_to_next
       or new.volume_24h is distinct from old.volume_24h
       or new.accuracy is distinct from old.accuracy
       or new.roi is distinct from old.roi
       or new.pnl is distinct from old.pnl then
      raise exception 'Cannot modify gamification stats directly';
    end if;
    -- F04: identity fields must be written via update_profile_cpf RPC only
    if new.cpf is distinct from old.cpf then
      raise exception 'Cannot modify cpf directly; use update_profile_cpf RPC';
    end if;
    if new.phone is distinct from old.phone then
      raise exception 'Cannot modify phone directly; use update_profile_cpf RPC';
    end if;
  end if;
  return new;
end;
$$;
