create or replace view public.leaderboard as
select
  p.id,
  p.name,
  p.handle,
  p.avatar,
  p.division,
  p.accuracy,
  p.roi,
  p.streak,
  p.volume_24h   as volume,
  p.city,
  p.neighborhood,
  p.is_ai,
  0.0::numeric   as weekly_growth,
  rank() over (order by p.accuracy desc, p.roi desc) as global_rank
from public.profiles p
where p.is_ai = false
order by global_rank;
