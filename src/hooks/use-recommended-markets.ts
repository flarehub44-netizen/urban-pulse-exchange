import { useMemo } from "react";
import type { Market } from "@/store/viax-store";
import type { OwnProfileSnapshot, OpenBetSnapshot } from "@/actions/account";

type RecommendedResult = {
  markets: Market[];
  label: "Para você" | "Em Alta";
};

export function useRecommendedMarkets(
  markets: Market[],
  profile: OwnProfileSnapshot | null | undefined,
  recentBets: OpenBetSnapshot[],
): RecommendedResult {
  return useMemo(() => {
    const live = markets.filter((m) => m.status === "live" || m.status === "closing");
    if (!live.length) return { markets: [], label: "Em Alta" };

    const userCity = profile?.city?.toLowerCase() ?? "";
    const userHood = profile?.neighborhood?.toLowerCase() ?? "";

    // Derive categories the user has bet on recently
    const recentCategories = new Set(
      recentBets
        .slice(0, 10)
        .map((b) => {
          const m = markets.find((mm) => mm.id === b.marketId);
          return m?.category ?? null;
        })
        .filter(Boolean) as string[],
    );

    const score = (m: Market): number => {
      let s = 0;
      const region = m.region.toLowerCase();
      if (userHood && region.includes(userHood)) s += 30;
      else if (userCity && region.includes(userCity)) s += 20;
      if (recentCategories.has(m.category)) s += 10;
      // volume bonus (log-scaled, max ~20)
      s += Math.min(20, Math.log10((m.pool.YES + m.pool.NO) / 100 + 1) * 7);
      return s;
    };

    const sorted = [...live].sort((a, b) => score(b) - score(a)).slice(0, 4);
    const hasPersonalization = userCity || userHood || recentCategories.size > 0;

    return {
      markets: sorted,
      label: hasPersonalization ? "Para você" : "Em Alta",
    };
  }, [markets, profile, recentBets]);
}
