-- App uses email/password only; drop Supabase Anonymous Auth artifacts.

drop function if exists public.is_user_anonymous(uuid);

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
  v_registered boolean;
  v_profile profiles%rowtype;
  v_pa partner_accounts%rowtype;
  v_app partner_applications%rowtype;
  v_partner jsonb;
  v_can_claim boolean := false;
begin
  if v_uid is null then
    return jsonb_build_object(
      'auth', jsonb_build_object('authenticated', false, 'registered', false)
    );
  end if;

  select u.email, u.email_confirmed_at
  into v_email, v_confirmed
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

grant execute on function public.get_my_account_context() to authenticated;
