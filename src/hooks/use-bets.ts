import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Side } from "@/store/viax-store";
import { normalizeMarketStatus, type MarketStatus } from "@/lib/market-status";

export interface OpenBet {
  id: string;
  marketId: string;
  marketQuestion: string;
  marketRegion: string;
  marketStatus: MarketStatus;
  marketEndsAt: number;
  poolYes: number;
  poolNo: number;
  side: Side;
  stake: number;
  share: number | null;
  payout: number | null;
  note: string | null;
  createdAt: number;
}

function mapBet(row: Record<string, unknown>): OpenBet {
  const market = row.markets as Record<string, unknown> | null;
  return {
    id: row.id as string,
    marketId: row.market_id as string,
    marketQuestion: (market?.question as string) ?? "",
    marketRegion: (market?.region as string) ?? "",
    marketStatus: normalizeMarketStatus((market?.status as string) ?? "live"),
    marketEndsAt: market?.ends_at ? new Date(market.ends_at as string).getTime() : 0,
    poolYes: Number(market?.pool_yes ?? 0),
    poolNo: Number(market?.pool_no ?? 0),
    side: row.side as Side,
    stake: Number(row.stake),
    share: row.share != null ? Number(row.share) : null,
    payout: row.payout != null ? Number(row.payout) : null,
    note: (row.note as string | null) ?? null,
    createdAt: new Date(row.created_at as string).getTime(),
  };
}

export function useBets(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["bets"],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const { data, error } = (await supabase
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
