-- Add public/private option to leagues create RPC and expose is_public in listings

create or replace function public.create_league(p_name text, p_is_public boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_league public.leagues;
  v_code text;
  v_attempt int := 0;
begin
  if auth.uid() is null then
    raise exception 'unauthenticated';
  end if;
  if length(coalesce(trim(p_name), '')) < 2 then
    raise exception 'invalid_name';
  end if;

  loop
    v_code := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from public.leagues where invite_code = v_code);
    v_attempt := v_attempt + 1;
    if v_attempt > 10 then raise exception 'code_gen_failed'; end if;
  end loop;

  insert into public.leagues (name, invite_code, created_by, is_public)
  values (trim(p_name), v_code, auth.uid(), coalesce(p_is_public, false))
  returning * into v_league;

  insert into public.league_members (league_id, user_id)
  values (v_league.id, auth.uid());

  return jsonb_build_object(
    'id', v_league.id,
    'name', v_league.name,
    'invite_code', v_league.invite_code,
    'is_public', v_league.is_public
  );
end;
$$;

revoke all on function public.create_league(text) from public, anon, authenticated;
grant execute on function public.create_league(text, boolean) to authenticated;

create or replace function public.get_my_leagues()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', l.id,
        'name', l.name,
        'invite_code', l.invite_code,
        'is_public', l.is_public,
        'is_creator', l.created_by = auth.uid(),
        'member_count', (select count(*) from public.league_members lm2 where lm2.league_id = l.id)
      )
      order by l.created_at desc
    )
    from public.leagues l
    join public.league_members lm on l.id = lm.league_id and lm.user_id = auth.uid()
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.get_my_leagues() to authenticated;
