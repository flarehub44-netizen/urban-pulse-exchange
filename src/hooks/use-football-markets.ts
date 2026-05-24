import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/supabase/loose";
import type { FootballOutcome } from "@/lib/football-parimutuel";
import type { MarketStatus } from "@/lib/market-status";

export type FootballMarketRow = {
  id: string;
  question: string;
  status: MarketStatus;
  pool_home: number;
  pool_draw: number;
  pool_away: number;
  participants: number;
  winning_outcome: FootballOutcome | null;
  accept_bets: boolean;
  betting_closes_at: string;
  fixture: {
    api_fixture_id: number;
    kickoff_at: string;
    status_short: string;
    home_team_name: string;
    away_team_name: string;
    goals_home: number | null;
    goals_away: number | null;
    api_league_id: number;
    home_logo_url: string | null;
    away_logo_url: string | null;
  };
};

export function mapFootballMarket(row: Record<string, unknown>): FootballMarketRow {
  const fixture = row.fixture as Record<string, unknown>;
  return {
    id: row.id as string,
    question: row.question as string,
    status: row.status as MarketStatus,
    pool_home: Number(row.pool_home),
    pool_draw: Number(row.pool_draw),
    pool_away: Number(row.pool_away),
    participants: Number(row.participants),
    winning_outcome: (row.winning_outcome as FootballOutcome | null) ?? null,
    accept_bets: Boolean(row.accept_bets),
    betting_closes_at: row.betting_closes_at as string,
    fixture: {
      api_fixture_id: Number(fixture.api_fixture_id),
      kickoff_at: fixture.kickoff_at as string,
      status_short: fixture.status_short as string,
      home_team_name: fixture.home_team_name as string,
      away_team_name: fixture.away_team_name as string,
      goals_home: fixture.goals_home != null ? Number(fixture.goals_home) : null,
      goals_away: fixture.goals_away != null ? Number(fixture.goals_away) : null,
      api_league_id: Number(fixture.api_league_id),
      home_logo_url: (fixture.home_logo_url as string | null) ?? null,
      away_logo_url: (fixture.away_logo_url as string | null) ?? null,
    },
  };
}

const FOOTBALL_MARKET_SELECT = `
  id,
  question,
  status,
  pool_home,
  pool_draw,
  pool_away,
  participants,
  winning_outcome,
  accept_bets,
  betting_closes_at,
  fixture:football_fixtures!inner (
    api_fixture_id,
    kickoff_at,
    status_short,
    home_team_name,
    away_team_name,
    goals_home,
    goals_away,
    api_league_id,
    home_logo_url,
    away_logo_url
  )
`;

export function useFootballMarkets() {
  return useQuery({
    queryKey: ["football-markets"],
    queryFn: async () => {
      const { data, error } = await db
        .from("football_markets")
        .select(FOOTBALL_MARKET_SELECT)
        .in("status", ["live", "closing", "closed", "resolving", "dispute", "settled", "void"])
        .order("betting_closes_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r) => mapFootballMarket(r as Record<string, unknown>));
    },
    staleTime: 15_000,
  });
}

export function useFootballMarket(marketId: string) {
  return useQuery({
    queryKey: ["football-markets", marketId],
    enabled: Boolean(marketId),
    queryFn: async () => {
      const { data, error } = await db
        .from("football_markets")
        .select(FOOTBALL_MARKET_SELECT)
        .eq("id", marketId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return mapFootballMarket(data as Record<string, unknown>);
    },
  });
}
