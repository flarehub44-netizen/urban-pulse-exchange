-- Unified catalog RPC (platform binary + football 1X3 + prediction multi-outcome)

create or replace function public.list_catalog_markets(
  p_vertical public.market_vertical default null,
  p_topic text default null,
  p_status text default 'live',
  p_sort text default 'volume',
  p_limit int default 48,
  p_offset int default 0,
  p_q text default null
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_result jsonb := '[]'::jsonb;
  v_q text := nullif(trim(lower(coalesce(p_q, ''))), '');
begin
  with unified as (
    -- Platform binary markets
    select
      m.id,
      'binary'::text as market_type,
      'platform'::public.catalog_market_source as source,
      m.question,
      'transito'::public.market_vertical as vertical,
      m.status,
      m.ends_at,
      null::text as image_url,
      (m.pool_yes + m.pool_no) as volume,
      m.participants,
      m.trend,
      jsonb_build_array(
        jsonb_build_object('id', 'YES', 'slug', 'yes', 'label', 'Sim', 'pool', m.pool_yes, 'probability',
          case when (m.pool_yes + m.pool_no) > 0 then m.pool_yes / (m.pool_yes + m.pool_no) else 0.5 end),
        jsonb_build_object('id', 'NO', 'slug', 'no', 'label', 'Não', 'pool', m.pool_no, 'probability',
          case when (m.pool_yes + m.pool_no) > 0 then m.pool_no / (m.pool_yes + m.pool_no) else 0.5 end)
      ) as outcomes,
      coalesce(
        (select jsonb_agg(ta.topic_slug) from public.market_topic_assignments ta
         where ta.market_id = m.id and ta.source = 'platform'),
        '[]'::jsonb
      ) as topics,
      '/markets/' || m.id as detail_path
    from public.markets m
    where coalesce(m.market_kind, 'platform') = 'platform'
      and coalesce(m.archived, false) = false
      and (p_vertical is null or p_vertical = 'transito')
      and (
        p_status = 'all'
        or (p_status = 'live' and m.status in ('live', 'closing'))
        or (p_status = 'resolved' and m.status in ('settled', 'resolved', 'void'))
        or m.status::text = p_status
      )
      and (v_q is null or lower(m.question) like '%' || v_q || '%' or lower(m.region) like '%' || v_q || '%')
      and (p_topic is null or exists (
        select 1 from public.market_topic_assignments ta
        where ta.market_id = m.id and ta.source = 'platform' and ta.topic_slug = p_topic
      ))

    union all

    -- Football 1X3
    select
      fm.id,
      'football_1x3'::text,
      'football'::public.catalog_market_source,
      fm.question,
      case when exists (
        select 1 from public.market_topic_assignments ta
        where ta.market_id = fm.id and ta.topic_slug = 'copa-2026'
      ) then 'copa'::public.market_vertical else 'esportes'::public.market_vertical end,
      fm.status,
      fm.betting_closes_at,
      ff.home_logo_url,
      (fm.pool_home + fm.pool_draw + fm.pool_away),
      fm.participants,
      0::numeric,
      jsonb_build_array(
        jsonb_build_object('id', 'HOME', 'slug', 'home', 'label', ff.home_team_name,
          'pool', fm.pool_home, 'probability',
          case when (fm.pool_home + fm.pool_draw + fm.pool_away) > 0
            then fm.pool_home / (fm.pool_home + fm.pool_draw + fm.pool_away) else 0.33 end),
        jsonb_build_object('id', 'DRAW', 'slug', 'draw', 'label', 'Empate',
          'pool', fm.pool_draw, 'probability',
          case when (fm.pool_home + fm.pool_draw + fm.pool_away) > 0
            then fm.pool_draw / (fm.pool_home + fm.pool_draw + fm.pool_away) else 0.34 end),
        jsonb_build_object('id', 'AWAY', 'slug', 'away', 'label', ff.away_team_name,
          'pool', fm.pool_away, 'probability',
          case when (fm.pool_home + fm.pool_draw + fm.pool_away) > 0
            then fm.pool_away / (fm.pool_home + fm.pool_draw + fm.pool_away) else 0.33 end)
      ),
      coalesce(
        (select jsonb_agg(ta.topic_slug) from public.market_topic_assignments ta
         where ta.market_id = fm.id and ta.source = 'football'),
        '["futebol"]'::jsonb
      ),
      '/football/' || fm.id
    from public.football_markets fm
    join public.football_fixtures ff on ff.api_fixture_id = fm.fixture_id
    where ff.review_status = 'approved'
      and (p_vertical is null or p_vertical in ('esportes', 'copa'))
      and (
        p_status = 'all'
        or (p_status = 'live' and fm.status in ('live', 'closing'))
        or (p_status = 'resolved' and fm.status in ('settled', 'void'))
        or fm.status::text = p_status
      )
      and (v_q is null or lower(fm.question) like '%' || v_q || '%'
        or lower(ff.home_team_name) like '%' || v_q || '%'
        or lower(ff.away_team_name) like '%' || v_q || '%')
      and (p_topic is null or exists (
        select 1 from public.market_topic_assignments ta
        where ta.market_id = fm.id and ta.source = 'football' and ta.topic_slug = p_topic
      ))

    union all

    -- Prediction multi-outcome
    select
      pm.id,
      'multi_outcome'::text,
      'prediction'::public.catalog_market_source,
      pm.question,
      pm.vertical,
      pm.status,
      pm.ends_at,
      pm.image_url,
      coalesce((select sum(o.pool) from public.market_outcomes o where o.market_id = pm.id), 0),
      pm.participants,
      0::numeric,
      coalesce(
        (select jsonb_agg(
          jsonb_build_object(
            'id', o.id::text,
            'slug', o.slug,
            'label', o.label,
            'pool', o.pool,
            'probability', case when tot.total > 0 then o.pool / tot.total else 1.0 / cnt.c
          )
          order by o.sort_order
        )
        from public.market_outcomes o
        cross join lateral (
          select coalesce(sum(pool), 0) as total from public.market_outcomes where market_id = pm.id
        ) tot
        cross join lateral (
          select greatest(count(*), 1)::numeric as c from public.market_outcomes where market_id = pm.id
        ) cnt
        where o.market_id = pm.id),
        '[]'::jsonb
      ),
      coalesce(
        (select jsonb_agg(ta.topic_slug) from public.market_topic_assignments ta
         where ta.market_id = pm.id and ta.source = 'prediction'),
        '[]'::jsonb
      ),
      '/pm/' || pm.id
    from public.prediction_markets pm
    where (p_vertical is null or pm.vertical = p_vertical)
      and (
        p_status = 'all'
        or (p_status = 'live' and pm.status in ('live', 'closing'))
        or (p_status = 'resolved' and pm.status in ('settled', 'void', 'resolved'))
        or pm.status::text = p_status
      )
      and (v_q is null or lower(pm.question) like '%' || v_q || '%')
      and (p_topic is null or exists (
        select 1 from public.market_topic_assignments ta
        where ta.market_id = pm.id and ta.source = 'prediction' and ta.topic_slug = p_topic
      ))
  ),
  filtered as (
    select * from unified u
    where (p_vertical is null or u.vertical = p_vertical)
  ),
  sorted as (
    select * from filtered f
    order by
      case when p_sort = 'closing' then extract(epoch from f.ends_at) end asc nulls last,
      case when p_sort = 'new' then extract(epoch from f.ends_at) end desc nulls last,
      case when p_sort = 'trend' then f.trend end desc nulls last,
      f.volume desc nulls last,
      f.id
    limit greatest(p_limit, 1)
    offset greatest(p_offset, 0)
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'type', s.market_type,
      'source', s.source,
      'question', s.question,
      'vertical', s.vertical,
      'status', s.status,
      'endsAt', s.ends_at,
      'imageUrl', s.image_url,
      'volume', s.volume,
      'participants', s.participants,
      'trend', s.trend,
      'outcomes', s.outcomes,
      'topics', s.topics,
      'detailPath', s.detail_path
    )
  ), '[]'::jsonb)
  into v_result
  from sorted s;

  return v_result;
end;
$$;

revoke execute on function public.list_catalog_markets(
  public.market_vertical, text, text, text, int, int, text
) from public, anon, authenticated;
grant execute on function public.list_catalog_markets(
  public.market_vertical, text, text, text, int, int, text
) to anon, authenticated;

-- Topic counts for sidebar
create or replace function public.list_catalog_topic_counts(
  p_vertical public.market_vertical default null
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object('slug', tc.slug, 'label', tc.label, 'vertical', tc.vertical, 'count', cnt.n)
    order by tc.sort_order
  ), '[]'::jsonb)
  from public.market_topic_catalog tc
  left join lateral (
    select count(*)::int as n
    from public.market_topic_assignments ta
    where ta.topic_slug = tc.slug
      and (p_vertical is null or tc.vertical = p_vertical)
  ) cnt on true
  where p_vertical is null or tc.vertical = p_vertical;
$$;

revoke execute on function public.list_catalog_topic_counts(public.market_vertical) from public, anon, authenticated;
grant execute on function public.list_catalog_topic_counts(public.market_vertical) to anon, authenticated;
