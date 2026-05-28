-- Partner application: validate social_links on apply; expose fields in admin list

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
  v_social jsonb;
  v_promotion text;
  v_instagram text;
  v_tiktok text;
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

  if length(trim(coalesce(p_bio, ''))) < 20 then
    raise exception 'A motivação deve ter pelo menos 20 caracteres.';
  end if;

  v_promotion := nullif(trim(coalesce(p_social->>'promotion_channels', '')), '');
  if v_promotion is null then
    raise exception 'Informe onde você vai divulgar a ViaX.';
  end if;

  v_instagram := nullif(trim(regexp_replace(coalesce(p_social->>'instagram', ''), '^@+', '')), '');
  if v_instagram is null then
    raise exception 'Instagram é obrigatório.';
  end if;

  v_tiktok := nullif(trim(regexp_replace(coalesce(p_social->>'tiktok', ''), '^@+', '')), '');

  v_social := jsonb_build_object(
    'promotion_channels', v_promotion,
    'instagram', v_instagram
  );
  if v_tiktok is not null then
    v_social := v_social || jsonb_build_object('tiktok', v_tiktok);
  end if;

  select handle into v_handle from public.profiles where id = v_uid;
  v_slug := lower(regexp_replace(coalesce(v_handle, 'trader'), '[^a-z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);
  if length(v_slug) < 3 then v_slug := 'creator-' || substr(v_uid::text, 1, 8); end if;

  insert into public.partner_applications (user_id, bio, focus_city, social_links)
  values (v_uid, trim(p_bio), nullif(trim(p_focus_city), ''), v_social);

  return jsonb_build_object('ok', true, 'proposed_slug', v_slug);
end;
$$;

create or replace function public.admin_list_partner_applications()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', a.id, 'user_id', a.user_id, 'handle', p.handle, 'name', p.name,
      'bio', a.bio, 'focus_city', a.focus_city, 'created_at', a.created_at,
      'social_links', a.social_links,
      'promotion_channels', a.social_links->>'promotion_channels',
      'instagram', a.social_links->>'instagram',
      'tiktok', a.social_links->>'tiktok'
    ) order by a.created_at desc)
    from public.partner_applications a
    join public.profiles p on p.id = a.user_id
    where a.status = 'pending'
  ), '[]'::jsonb);
end;
$$;
