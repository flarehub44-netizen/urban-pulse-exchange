-- Hall da fama: histórico de temporadas encerradas

create or replace function public.get_league_season_history(
  p_league_id uuid,
  p_limit int default 12
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return '[]'::jsonb;
  end if;

  if not exists (
    select 1 from public.league_members
    where league_id = p_league_id and user_id = auth.uid()
  ) and not exists (
    select 1 from public.leagues
    where id = p_league_id and is_public = true
  ) then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'season_label', h.season_label,
        'starts_at', h.starts_at,
        'ends_at', h.ends_at,
        'winner_user_id', h.winner_user_id,
        'winner_name', coalesce(p.name, '—'),
        'top_scores', h.top_scores
      )
      order by h.ends_at desc
    )
    from (
      select *
      from public.league_season_history
      where league_id = p_league_id
      order by ends_at desc
      limit greatest(p_limit, 1)
    ) h
    left join public.profiles p on p.id = h.winner_user_id
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.get_league_season_history(uuid, int) to authenticated;
