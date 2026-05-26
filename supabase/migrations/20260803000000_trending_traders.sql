-- get_trending_traders: traders with most wins in last 7 days
create or replace function public.get_trending_traders(p_limit int default 5)
returns table (
  user_id uuid,
  name text,
  handle text,
  avatar text,
  division text,
  wins_7d bigint,
  bets_7d bigint,
  accuracy_7d numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id               as user_id,
    p.name,
    p.handle,
    p.avatar,
    p.division,
    count(*) filter (where b.payout > 0)                          as wins_7d,
    count(*)                                                       as bets_7d,
    round(
      count(*) filter (where b.payout > 0)::numeric / nullif(count(*), 0) * 100,
      1
    )                                                              as accuracy_7d
  from public.bets b
  join public.profiles p on p.id = b.user_id
  join public.markets  m on m.id = b.market_id
  where m.resolved_at >= now() - interval '7 days'
    and b.payout is not null
  group by p.id, p.name, p.handle, p.avatar, p.division
  having count(*) >= 2
  order by wins_7d desc, accuracy_7d desc
  limit p_limit;
$$;

revoke all on function public.get_trending_traders(int) from public;
grant execute on function public.get_trending_traders(int) to authenticated, anon;
