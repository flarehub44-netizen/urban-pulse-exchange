-- Formal account hierarchy: trader (default) + partner layer + admin flag

alter table public.profiles
  add column if not exists account_kind text not null default 'trader'
    check (account_kind in ('trader'));

-- ---------------------------------------------------------------------------
-- Registration helpers (auth.users is source of truth for email confirmation)
-- ---------------------------------------------------------------------------
create or replace function public.is_user_registered(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from auth.users u
    where u.id = p_user_id
      and u.email is not null
      and length(trim(u.email)) > 0
      and u.email_confirmed_at is not null
  );
$$;

create or replace function public.is_user_anonymous(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from auth.users u
    where u.id = p_user_id
      and coalesce(u.is_anonymous, false) = true
  );
$$;

-- ---------------------------------------------------------------------------
-- Unified account context for frontend guards and UI badges
-- ---------------------------------------------------------------------------
create or replace function public.get_my_account_context()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_confirmed timestamptz;
  v_anon boolean;
  v_registered boolean;
  v_profile profiles%rowtype;
  v_pa partner_accounts%rowtype;
  v_app partner_applications%rowtype;
  v_partner jsonb;
  v_can_claim boolean := false;
begin
  if v_uid is null then
    return jsonb_build_object(
      'auth', jsonb_build_object('authenticated', false, 'registered', false, 'anonymous', false)
    );
  end if;

  select u.email, u.email_confirmed_at, coalesce(u.is_anonymous, false)
  into v_email, v_confirmed, v_anon
  from auth.users u
  where u.id = v_uid;

  v_registered := v_email is not null
    and length(trim(v_email)) > 0
    and v_confirmed is not null;

  if v_registered and v_email is not null then
    select exists (
      select 1 from public.admin_allowlist a where lower(a.email) = lower(v_email)
    ) into v_can_claim;
  end if;

  select * into v_profile from public.profiles where id = v_uid;

  select * into v_pa from public.partner_accounts where user_id = v_uid;
  if found then
    v_partner := jsonb_build_object(
      'role', 'partner',
      'status', v_pa.status,
      'slug', v_pa.slug,
      'tier', v_pa.tier,
      'verified', v_pa.verified,
      'balance', v_pa.balance
    );
  else
    select * into v_app
    from public.partner_applications
    where user_id = v_uid and status = 'pending'
    order by created_at desc
    limit 1;
    if found then
      v_partner := jsonb_build_object('role', 'applicant', 'status', 'pending');
    else
      v_partner := jsonb_build_object('role', 'none');
    end if;
  end if;

  return jsonb_build_object(
    'auth', jsonb_build_object(
      'authenticated', true,
      'registered', v_registered,
      'anonymous', v_anon and not v_registered,
      'email', v_email
    ),
    'trader', jsonb_build_object(
      'profile_id', v_uid,
      'handle', coalesce(v_profile.handle, ''),
      'name', coalesce(v_profile.name, ''),
      'account_kind', coalesce(v_profile.account_kind, 'trader')
    ),
    'partner', v_partner,
    'admin', jsonb_build_object(
      'is_admin', coalesce(v_profile.is_admin, false),
      'can_claim_invite', v_can_claim or coalesce(v_profile.is_admin, false)
    )
  );
end;
$$;

-- Post-email-confirmation profile touch-up
create or replace function public.complete_registration(p_display_name text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  if not public.is_user_registered(v_uid) then
    return jsonb_build_object('ok', false, 'reason', 'email_not_confirmed');
  end if;

  if p_display_name is not null and length(trim(p_display_name)) >= 2 then
    update public.profiles
    set name = trim(p_display_name)
    where id = v_uid;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Partner apply: require confirmed email
-- ---------------------------------------------------------------------------
create or replace function public.apply_partner_program(
  p_bio text,
  p_focus_city text default null,
  p_social jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_handle text;
  v_slug text;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  if not public.is_user_registered(v_uid) then
    return jsonb_build_object('ok', false, 'reason', 'registration_required');
  end if;
  if exists (select 1 from public.partner_accounts where user_id = v_uid) then
    return jsonb_build_object('ok', false, 'reason', 'already_partner');
  end if;
  if exists (select 1 from public.partner_applications where user_id = v_uid and status = 'pending') then
    return jsonb_build_object('ok', false, 'reason', 'pending_application');
  end if;

  select handle into v_handle from public.profiles where id = v_uid;
  v_slug := lower(regexp_replace(coalesce(v_handle, 'trader'), '[^a-z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);
  if length(v_slug) < 3 then v_slug := 'creator-' || substr(v_uid::text, 1, 8); end if;

  insert into public.partner_applications (user_id, bio, focus_city, social_links)
  values (v_uid, coalesce(p_bio, ''), p_focus_city, coalesce(p_social, '{}'::jsonb));

  return jsonb_build_object('ok', true, 'proposed_slug', v_slug);
end;
$$;

-- Referral bind: require registered account
create or replace function public.bind_referral_attribution(
  p_slug text,
  p_campaign_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_res jsonb;
  v_partner_id uuid;
  v_cid uuid;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  if not public.is_user_registered(v_uid) then
    return jsonb_build_object('ok', false, 'reason', 'registration_required');
  end if;
  if exists (select 1 from public.user_referrals where user_id = v_uid) then
    return jsonb_build_object('ok', false, 'reason', 'already_attributed');
  end if;

  v_res := public.resolve_partner_slug(p_slug);
  if not (v_res->>'ok')::boolean then return jsonb_build_object('ok', false, 'reason', 'invalid_slug'); end if;
  v_partner_id := (v_res->>'partner_id')::uuid;
  if v_partner_id = v_uid then return jsonb_build_object('ok', false, 'reason', 'self_referral'); end if;

  v_cid := coalesce(p_campaign_id, (v_res->>'campaign_id')::uuid);

  insert into public.user_referrals (user_id, partner_id, campaign_id)
  values (v_uid, v_partner_id, v_cid);

  update public.referral_clicks rc
  set converted_user_id = v_uid
  from (
    select id from public.referral_clicks
    where partner_id = v_partner_id and converted_user_id is null
      and created_at >= now() - interval '30 days'
    order by created_at desc limit 1
  ) last
  where rc.id = last.id;

  if v_cid is not null then
    update public.partner_campaigns set conversions = conversions + 1 where id = v_cid;
  end if;

  perform public.emit_partner_event(v_partner_id, 'signup', 'Novo trader entrou via seu link', jsonb_build_object('user_id', v_uid));

  return jsonb_build_object('ok', true, 'partner_id', v_partner_id);
end;
$$;

-- Admin invite: require registered account
create or replace function public.claim_admin_invite(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_invite admin_invites%rowtype;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  if not public.is_user_registered(v_uid) then
    return jsonb_build_object('ok', false, 'reason', 'registration_required');
  end if;
  if p_code is null or length(trim(p_code)) < 6 then
    raise exception 'Invalid invite code';
  end if;

  select * into v_invite
  from public.admin_invites
  where code = trim(p_code)
  for update;

  if not found then raise exception 'Invite code not found'; end if;
  if v_invite.used_by is not null then raise exception 'Invite code already used'; end if;

  update public.admin_invites
  set used_by = v_uid, used_at = now()
  where code = trim(p_code);

  update public.profiles
  set is_admin = true
  where id = v_uid;

  return jsonb_build_object('ok', true, 'user_id', v_uid);
end;
$$;

grant execute on function public.is_user_registered(uuid) to authenticated;
grant execute on function public.is_user_anonymous(uuid) to authenticated;
grant execute on function public.get_my_account_context() to authenticated;
grant execute on function public.complete_registration(text) to authenticated;
