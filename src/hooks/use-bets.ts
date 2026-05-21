import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/supabase/loose";
import type { Side } from "@/store/viax-store";

export interface OpenBet {
  id: string;
  marketId: string;
  marketQuestion: string;
  marketRegion: string;
  marketStatus: "live" | "closing" | "resolved";
  marketEndsAt: number;
  poolYes: number;
  poolNo: number;
  side: Side;
  stake: number;
  share: number | null;
  payout: number | null;
  createdAt: number;
}

function mapBet(row: Record<string, unknown>): OpenBet {
  const market = row.markets as Record<string, unknown> | null;
  return {
    id: row.id as string,
    marketId: row.market_id as string,
    marketQuestion: (market?.question as string) ?? "",
    marketRegion: (market?.region as string) ?? "",
    marketStatus: ((market?.status as string) ?? "live") as OpenBet["marketStatus"],
    marketEndsAt: market?.ends_at ? new Date(market.ends_at as string).getTime() : 0,
    poolYes: Number(market?.pool_yes ?? 0),
    poolNo: Number(market?.pool_no ?? 0),
    side: row.side as Side,
    stake: Number(row.stake),
    share: row.share != null ? Number(row.share) : null,
    payout: row.payout != null ? Number(row.payout) : null,
    createdAt: new Date(row.created_at as string).getTime(),
  };
}

export function useBets() {
  return useQuery({
    queryKey: ["bets"],
    queryFn: async () => {
      const { data, error } = (await db
        .from("bets")
        .select("*, markets(question, region, status, ends_at, pool_yes, pool_no)")
        .order("created_at", { ascending: false })
        .limit(100)) as { data: Record<string, unknown>[] | null; error: Error | null };
      if (error) throw error;
      return (data ?? []).map(mapBet);
    },
    staleTime: 15_000,
  });
}
