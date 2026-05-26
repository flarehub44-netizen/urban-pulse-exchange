import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  dateRangeDays,
  getFixtureById,
  getFixturesByDate,
  type ApiFootballFixtureDto,
} from "@/lib/api-football.server";
import { withJobLog, logApiMetric } from "@/lib/structured-log.server";

let consecutiveSyncFailures = 0;
const CRON_ALERT_THRESHOLD = 3;

function getServiceClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service role not configured");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function upsertFixture(supabase: SupabaseClient, f: ApiFootballFixtureDto) {
  const { error } = await supabase.rpc("upsert_football_fixture", {
    p_api_fixture_id: f.api_fixture_id,
    p_api_league_id: f.api_league_id,
    p_season: f.season,
    p_kickoff_at: f.kickoff_at,
    p_status_short: f.status_short,
    p_home_team_id: f.home_team_id,
    p_home_team_name: f.home_team_name,
    p_away_team_id: f.away_team_id,
    p_away_team_name: f.away_team_name,
    p_goals_home: f.goals_home,
    p_goals_away: f.goals_away,
    p_venue: f.venue,
    p_league_name: f.league_name,
    p_league_country: f.league_country,
    p_raw: f.raw,
    p_home_logo_url: f.home_logo_url,
    p_away_logo_url: f.away_logo_url,
    p_goals_home_ht: f.goals_home_ht,
    p_goals_away_ht: f.goals_away_ht,
    p_elapsed: f.elapsed,
  });
  if (error) throw new Error(error.message);
}

export async function runFootballSync(): Promise<unknown> {
  return withJobLog("football_sync", async () => {
    const supabase = getServiceClient();

    const { data: enabled } = await supabase.rpc("is_football_enabled");
    if (enabled === false) return { ok: true, skipped: "football_disabled" };

    const { data: leagueIdsRow } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "football_league_ids")
      .maybeSingle();

    const leagueIds = (leagueIdsRow?.value as number[] | undefined) ?? [71];

    const { data: daysRow } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "football_sync_days_ahead")
      .maybeSingle();

    const daysAhead = Number(daysRow?.value ?? 7);
    const dates = dateRangeDays(new Date(), daysAhead);
    let upserted = 0;
    const errors: string[] = [];

    if (!process.env.API_FOOTBALL_KEY) {
      return { ok: false, error: "API_FOOTBALL_KEY not configured", upserted: 0 };
    }

    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
    let autoApproved = 0;

    for (const date of dates) {
      try {
        const fixtures = await getFixturesByDate(date, leagueIds);
        for (const f of fixtures) {
          await upsertFixture(supabase, f);
          upserted++;

          const kickoffMs = new Date(f.kickoff_at).getTime();
          if (kickoffMs > Date.now() + TWO_HOURS_MS) {
            const { error: approveErr } = await supabase.rpc("admin_approve_football_fixture", {
              p_fixture_id: f.api_fixture_id,
            });
            if (!approveErr) autoApproved++;
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[FootballSync]", date, msg);
        errors.push(`${date}: ${msg}`);
      }
    }

    await supabase.rpc("cron_close_football_bets");

    if (errors.length > 0) {
      consecutiveSyncFailures++;
      if (consecutiveSyncFailures >= CRON_ALERT_THRESHOLD) {
        logApiMetric("football_cron.consecutive_failures", {
          ok: false,
          kind: "cron_alert",
          count: consecutiveSyncFailures,
          errors,
        });
      }
    } else {
      consecutiveSyncFailures = 0;
    }

    return { ok: true, upserted, autoApproved, dates: dates.length, errors };
  });
}

export async function runFootballResolve(): Promise<unknown> {
  return withJobLog("football_resolve", async () => {
    const supabase = getServiceClient();

    const { data: enabled } = await supabase.rpc("is_football_enabled");
    if (enabled === false) return { ok: true, skipped: "football_disabled" };

    const { data: fixtureIds, error: listErr } = await supabase.rpc(
      "list_football_markets_for_resolve",
    );
    if (listErr) throw new Error(listErr.message);

    const ids = (fixtureIds as bigint[] | number[] | null) ?? [];
    const results: unknown[] = [];

    for (const rawId of ids) {
      const fixtureId = Number(rawId);
      try {
        if (process.env.API_FOOTBALL_KEY) {
          const fresh = await getFixtureById(fixtureId);
          if (fresh) await upsertFixture(supabase, fresh);
        }

        const { data, error } = await supabase.rpc("resolve_football_fixture", {
          p_fixture_id: fixtureId,
        });
        if (error) throw new Error(error.message);
        results.push({ fixtureId, ...(data as object) });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[FootballResolve]", fixtureId, msg);
        results.push({ fixtureId, error: msg });
      }
    }

    return { ok: true, processed: results.length, results };
  });
}
