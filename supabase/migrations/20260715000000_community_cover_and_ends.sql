-- Community markets: optional cover image + storage bucket

alter table public.markets
  add column if not exists cover_url text;

-- ---------------------------------------------------------------------------
-- Storage bucket for community cover uploads
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'community-covers',
  'community-covers',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "community_covers_select" on storage.objects;
create policy "community_covers_select"
  on storage.objects for select
  to public
  using (bucket_id = 'community-covers');

drop policy if exists "community_covers_insert" on storage.objects;
create policy "community_covers_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'community-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "community_covers_update" on storage.objects;
create policy "community_covers_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'community-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "community_covers_delete" on storage.objects;
create policy "community_covers_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'community-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- JSON helper
-- ---------------------------------------------------------------------------
create or replace function public.community_market_row_to_json(m public.markets)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'id', m.id,
    'question', m.question,
    'region', m.region,
    'region_id', m.region_id,
    'target', m.target,
    'category', m.category,
    'ends_at', m.ends_at,
    'pool_yes', m.pool_yes,
    'pool_no', m.pool_no,
    'participants', m.participants,
    'trend', m.trend,
    'ai_side', m.ai_side,
    'ai_value', m.ai_value,
    'ai_confidence', m.ai_confidence,
    'status', m.status,
    'accept_bets', m.accept_bets,
    'frozen', m.frozen,
    'resolved', m.resolved,
    'archived', coalesce(m.archived, false),
    'market_kind', m.market_kind,
    'visibility', m.visibility,
    'created_by', m.created_by,
    'resolution_mode', m.resolution_mode,
    'has_access_token', m.access_token is not null,
    'cover_url', m.cover_url
  );
$$;

-- ---------------------------------------------------------------------------
-- create_community_market (cover_url optional)
-- ---------------------------------------------------------------------------
drop function if exists public.create_community_market(text, timestamptz, text);

create or replace function public.create_community_market(
  p_question text,
  p_ends_at timestamptz,
  p_visibility text default 'public',
  p_cover_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id text;
  v_token text;
  v_active int;
  v_vis text;
  v_cover text;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  if not public.is_user_registered(v_uid) then
    raise exception 'registration_required';
  end if;

  v_vis := lower(trim(coalesce(p_visibility, 'public')));
  if v_vis not in ('public', 'unlisted') then
    raise exception 'invalid_visibility';
  end if;

  if length(trim(p_question)) < 10 or length(trim(p_question)) > 280 then
    raise exception 'question_length_invalid';
  end if;

  if p_ends_at is null or p_ends_at <= now() + interval '1 hour' then
    raise exception 'ends_at_too_soon';
  end if;
  if p_ends_at > now() + interval '90 days' then
    raise exception 'ends_at_too_far';
  end if;

  v_cover := nullif(trim(coalesce(p_cover_url, '')), '');
  if v_cover is not null then
    if v_cover !~ (
      '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/community-covers/'
      || v_uid::text
      || '/'
    ) then
      raise exception 'invalid_cover_url';
    end if;
  end if;

  select count(*) into v_active
  from public.markets
  where created_by = v_uid
    and market_kind = 'community'
    and status in ('live', 'closing', 'closed');

  if v_active >= 10 then
    raise exception 'community_market_limit';
  end if;

  v_id := 'cm-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
  if v_vis = 'unlisted' then
    v_token := replace(gen_random_uuid()::text, '-', '');
  end if;

  insert into public.markets (
    id, question, region, target, category, ends_at,
    status, accept_bets, pool_yes, pool_no, participants, trend,
    ai_side, ai_value, ai_confidence,
    data_source, resolution_metric, comparison_op, region_id,
    market_kind, created_by, visibility, access_token, resolution_mode,
    starts_at, cover_url
  ) values (
    v_id,
    trim(p_question),
    'Comunidade',
    0,
    'Evento'::market_category,
    p_ends_at,
    'live',
    true,
    0,
    0,
    0,
    0,
    'YES'::bet_side,
    0,
    0.5,
    'manual',
    null,
    null,
    null,
    'community',
    v_uid,
    v_vis,
    v_token,
    'creator',
    now(),
    v_cover
  );

  insert into public.market_access (market_id, user_id)
  values (v_id, v_uid)
  on conflict do nothing;

  return jsonb_build_object(
    'market_id', v_id,
    'visibility', v_vis,
    'access_token', v_token,
    'status', 'live'
  );
end;
$$;

revoke all on function public.create_community_market(text, timestamptz, text, text) from public;
grant execute on function public.create_community_market(text, timestamptz, text, text) to authenticated;
