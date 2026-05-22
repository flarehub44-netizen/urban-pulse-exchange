import { useQuery } from "@tanstack/react-query";
import { db as supabase } from "@/integrations/supabase/loose";
import type { Side } from "@/store/viax-store";

export interface MarketBetActivity {
  side: Side;
  stake: number;
  share: number | null;
  handle: string;
  name: string;
  avatar: string;
  createdAt: number;
}

export function useMarketBets(marketId: string) {
  return useQuery({
    queryKey: ["market_bets", marketId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_market_recent_bets", {
        p_market_id: marketId,
        p_limit: 12,
      });
      if (error) throw error;
      return ((data ?? []) as Record<string, unknown>[]).map(
        (row): MarketBetActivity => ({
          side: row.side as Side,
          stake: Number(row.stake),
          share: row.share != null ? Number(row.share) : null,
          handle: row.handle as string,
          name: row.name as string,
          avatar: row.avatar as string,
          createdAt: new Date(row.created_at as string).getTime(),
        }),
      );
    },
    enabled: !!marketId,
    staleTime: 8_000,
  });
}
