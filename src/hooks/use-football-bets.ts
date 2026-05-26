import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { FootballOutcome } from "@/lib/football-parimutuel";
import { normalizeMarketStatus, type MarketStatus } from "@/lib/market-status";

export interface FootballOpenBet {
  id: string;
  marketId: string;
  marketQuestion: string;
  marketStatus: MarketStatus;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: number;
  outcome: FootballOutcome;
  stake: number;
  share: number | null;
  payout: number | null;
  poolHome: number;
  poolDraw: number;
  poolAway: number;
  createdAt: number;
}

function mapFootballBet(row: Record<string, unknown>): FootballOpenBet {
  const market = row.football_markets as Record<string, unknown> | null;
  const fixture = market?.football_fixtures as Record<string, unknown> | null;
  return {
    id: row.id as string,
    marketId: row.market_id as string,
    marketQuestion: (market?.question as string) ?? "",
    marketStatus: normalizeMarketStatus((market?.status as string) ?? "live"),
    homeTeam: (fixture?.home_team_name as string) ?? "",
    awayTeam: (fixture?.away_team_name as string) ?? "",
    kickoffAt: fixture?.kickoff_at ? new Date(fixture.kickoff_at as string).getTime() : 0,
    outcome: row.outcome as FootballOutcome,
    stake: Number(row.stake),
    share: row.share != null ? Number(row.share) : null,
    payout: row.payout != null ? Number(row.payout) : null,
    poolHome: Number(market?.pool_home ?? 0),
    poolDraw: Number(market?.pool_draw ?? 0),
    poolAway: Number(market?.pool_away ?? 0),
    createdAt: new Date(row.created_at as string).getTime(),
  };
}

export function useFootballBets() {
  return useQuery({
    queryKey: ["football-bets"],
    queryFn: async () => {
      const { data, error } = (await supabase
        .from("football_bets")
        .select(
          `*,
          football_markets (
            question,
            status,
            pool_home,
            pool_draw,
            pool_away,
            football_fixtures (
              home_team_name,
              away_team_name,
              kickoff_at
            )
          )`,
        )
        .order("created_at", { ascending: false })
        .limit(100)) as { data: Record<string, unknown>[] | null; error: Error | null };
      if (error) throw error;
      return (data ?? []).map(mapFootballBet);
    },
    staleTime: 15_000,
  });
}
