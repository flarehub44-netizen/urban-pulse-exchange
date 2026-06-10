import fs from "node:fs";

const src = fs.readFileSync("supabase/migrations/20261101000002_list_catalog_markets.sql", "utf8");

const cryptoUnion = `
    union all

    -- Crypto short-term slots (when enabled and live)
    select
      cs.id,
      'crypto_slot'::text as market_type,
      'crypto_slot'::public.catalog_market_source as source,
      cs.question,
      'crypto'::public.market_vertical as vertical,
      cs.status::text,
      cs.slot_end as ends_at,
      null::text as image_url,
      (cs.pool_up + cs.pool_down) as volume,
      cs.participants,
      0::numeric,
      jsonb_build_array(
        jsonb_build_object('id', 'up', 'slug', 'up', 'label', 'Sobe', 'pool', cs.pool_up, 'probability',
          case when (cs.pool_up + cs.pool_down) > 0 then cs.pool_up / (cs.pool_up + cs.pool_down) else 0.5 end),
        jsonb_build_object('id', 'down', 'slug', 'down', 'label', 'Desce', 'pool', cs.pool_down, 'probability',
          case when (cs.pool_up + cs.pool_down) > 0 then cs.pool_down / (cs.pool_up + cs.pool_down) else 0.5 end)
      ) as outcomes,
      '["up-down"]'::jsonb as topics,
      '/v/crypto' as detail_path
    from public.crypto_slot_markets cs
    where cs.status in ('live', 'closing')
      and now() < cs.slot_end
      and exists (
        select 1 from public.platform_settings ps
        where ps.key = 'crypto_short_term_enabled'
          and ps.value::text in ('true', '"true"')
      )
      and (p_vertical is null or p_vertical = 'crypto')
      and (
        p_status = 'all'
        or (p_status = 'live' and cs.status in ('live', 'closing'))
      )
      and (v_q is null or lower(cs.question) like '%' || v_q || '%')
      and (p_topic is null or p_topic = 'up-down')
`;

const marker = "  ),\n  filtered as (";
if (!src.includes(marker)) {
  console.error("marker not found");
  process.exit(1);
}
const catalogFn = src.replace(marker, `${cryptoUnion}\n${marker}`);

const header = `-- P0-P3 improvements: crypto catalog, taxonomy, events metrics

do $$ begin
  alter type public.catalog_market_source add value 'crypto_slot';
exception when duplicate_object then null;
end $$;

insert into public.market_topic_catalog (slug, label, vertical, sort_order) values
  ('regulacao', 'Regulação', 'crypto', 4),
  ('altcoins', 'Altcoins', 'crypto', 5),
  ('macro', 'Macro', 'economia', 3),
  ('cambio', 'Câmbio', 'economia', 4),
  ('cinema', 'Cinema', 'cultura', 3),
  ('tv', 'TV', 'cultura', 4),
  ('musica', 'Música', 'cultura', 5),
  ('streaming', 'Streaming', 'cultura', 6),
  ('espaco', 'Espaço', 'tech', 4),
  ('semiconductores', 'Semicondutores', 'tech', 5)
on conflict (slug) do nothing;

`;

const overviewFn = `
create or replace function public.admin_get_events_hub_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
begin
  perform public.assert_admin();

  return jsonb_build_object(
    'platform_events', jsonb_build_object(
      'active', (
        select count(*)::int from public.platform_events
        where v_now between starts_at and ends_at
      ),
      'upcoming', (
        select count(*)::int from public.platform_events where starts_at > v_now
      ),
      'ended', (
        select count(*)::int from public.platform_events where ends_at < v_now
      )
    ),
    'daily_polls', jsonb_build_object(
      'has_today', exists (
        select 1 from public.daily_polls where poll_date = current_date
      ),
      'total', (select count(*)::int from public.daily_polls)
    ),
    'partner_events', jsonb_build_object(
      'last_24h', (
        select count(*)::int from public.partner_events
        where created_at >= v_now - interval '24 hours'
      )
    ),
    'markets', jsonb_build_object(
      'live', (
        select count(*)::int from public.markets
        where status in ('live', 'closing', 'closed') and coalesce(frozen, false) = false
      ),
      'dispute', (
        select count(*)::int from public.markets where status = 'dispute'
      ),
      'draft', (
        select count(*)::int from public.markets where status = 'draft'
      )
    ),
    'prediction', jsonb_build_object(
      'live', (select count(*)::int from public.prediction_markets where status in ('live', 'closing')),
      'outcome_bets_24h', (
        select count(*)::int from public.outcome_bets where created_at >= v_now - interval '24 hours'
      ),
      'outcome_volume_24h', (
        select coalesce(sum(stake), 0) from public.outcome_bets where created_at >= v_now - interval '24 hours'
      )
    ),
    'engagement', jsonb_build_object(
      'active_event_bets_24h', (
        select count(distinct ob.user_id)::int
        from public.outcome_bets ob
        where ob.created_at >= v_now - interval '24 hours'
          and exists (
            select 1 from public.platform_events pe
            where v_now between pe.starts_at and pe.ends_at
          )
      )
    ),
    'football', jsonb_build_object(
      'pending_fixtures', (
        select count(*)::int from public.football_fixtures
        where review_status = 'pending_review'
      )
    ),
    'community', jsonb_build_object(
      'pending_reports', (
        select count(*)::int from public.market_reports where status = 'pending'
      )
    ),
    'crypto_slots', jsonb_build_object(
      'enabled', exists (
        select 1 from public.platform_settings
        where key = 'crypto_short_term_enabled' and value::text in ('true', '"true"')
      ),
      'live', (
        select count(*)::int from public.crypto_slot_markets
        where status = 'live' and slot_end > v_now
      )
    )
  );
end;
$$;
`;

const out = header + "\n" + catalogFn + "\n" + overviewFn;
fs.writeFileSync("supabase/migrations/20261103000000_ps_improvements.sql", out);
console.log("Wrote migration", out.length, "bytes");
