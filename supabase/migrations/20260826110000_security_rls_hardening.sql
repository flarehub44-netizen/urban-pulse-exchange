-- Security hardening: RLS policy fix + column-restricted views
-- Addresses three audit findings:
--   1. user_mission_progress policy applies to public (anon) instead of authenticated
--   2. payment_intents.provider_payload readable by any authenticated user via REST API
--   3. profiles join in social feed returns null after profiles_read_own hardening

-- ---------------------------------------------------------------------------
-- 1. Fix user_mission_progress_own: scope to authenticated role only
-- ---------------------------------------------------------------------------
drop policy if exists "user_mission_progress_own" on public.user_mission_progress;

create policy "user_mission_progress_own"
  on public.user_mission_progress
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 2. payment_intents_safe: expose payment intents without provider_payload
-- provider_payload stores raw SyncPay webhook data (incl. payer CPF/name).
-- App code uses explicit column lists so this view is a REST-API safeguard.
-- ---------------------------------------------------------------------------
create or replace view public.payment_intents_safe
  with (security_invoker = true)
as
  select
    id, user_id, provider_id, type, amount, status,
    pix_key, qr_code, qr_code_img,
    expires_at, settled_at, meta,
    created_at, updated_at
  from public.payment_intents;

grant select on public.payment_intents_safe to authenticated;

-- ---------------------------------------------------------------------------
-- 3. profile_public: public trader fields for social feed
-- Owned by postgres so it reads profiles bypassing the profiles_read_own RLS.
-- Only exposes non-sensitive fields; cpf/phone/balance/is_admin/kyc_status
-- remain restricted to the user's own row via the base table policy.
-- ---------------------------------------------------------------------------
create or replace view public.profile_public as
  select
    id,
    handle,
    name,
    avatar,
    city,
    neighborhood,
    division,
    accuracy,
    roi,
    streak,
    volume_24h,
    created_at
  from public.profiles;

alter view public.profile_public owner to postgres;

grant select on public.profile_public to authenticated, anon;
