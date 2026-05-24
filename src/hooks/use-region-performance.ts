import { useMemo } from "react";
import type { OpenBet } from "@/hooks/use-bets";

export interface RegionStat {
  region: string;
  total: number;
  wins: number;
  accuracy: number;
  pnl: number;
}

/**
 * Aggregates resolved bets by region to surface where the user performs best.
 * A bet is counted as "resolved" when payout is not null.
 * A "win" is when payout > stake.
 */
export function useRegionPerformance(bets: OpenBet[] | undefined): RegionStat[] {
  return useMemo(() => {
    if (!bets?.length) return [];

    const map = new Map<string, { total: number; wins: number; pnl: number }>();

    for (const bet of bets) {
      if (bet.payout == null) continue; // unresolved
      const region = bet.marketRegion || "Outras";
      const existing = map.get(region) ?? { total: 0, wins: 0, pnl: 0 };
      const isWin = bet.payout > bet.stake;
      map.set(region, {
        total: existing.total + 1,
        wins: existing.wins + (isWin ? 1 : 0),
        pnl: existing.pnl + (bet.payout - bet.stake),
      });
    }

    return Array.from(map.entries())
      .map(([region, s]) => ({
        region,
        total: s.total,
        wins: s.wins,
        accuracy: s.total > 0 ? s.wins / s.total : 0,
        pnl: s.pnl,
      }))
      .filter((s) => s.total >= 2) // only regions with meaningful sample
      .sort((a, b) => b.accuracy - a.accuracy);
  }, [bets]);
}
