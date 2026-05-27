-- Fix get_active_events: ORDER BY must be inside jsonb_agg, not at query level.

create or replace function public.get_active_events()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', id,
        'name', name,
        'slug', slug,
        'description', description,
        'badge_icon', badge_icon,
        'xp_boost', xp_boost,
        'ends_at', ends_at
      )
      order by ends_at asc
    )
    from public.platform_events
    where now() between starts_at and ends_at
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.get_active_events() to anon, authenticated;
