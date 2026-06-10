import { getServiceClient } from "@/lib/supabase-service.server";

export async function runLeagueStatsRefresh() {
  const supabase = getServiceClient();
  const { data, error } = await supabase.rpc("cron_refresh_league_stats");
  if (error) throw new Error(error.message);
  return data as { ok?: boolean; refreshed?: number };
}

export async function runLeagueSeasonAdvance() {
  const supabase = getServiceClient();
  const { data, error } = await supabase.rpc("cron_advance_expired_league_seasons");
  if (error) throw new Error(error.message);
  return data as { ok?: boolean; advanced?: number };
}

export async function runLeagueCron() {
  const refresh = await runLeagueStatsRefresh();
  const advance = await runLeagueSeasonAdvance();
  return { refresh, advance };
}
