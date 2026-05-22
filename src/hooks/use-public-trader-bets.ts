import { useQuery } from "@tanstack/react-query";
import { db as supabase } from "@/integrations/supabase/loose";
import type { Side } from "@/store/viax-store";

export type PublicTraderBet = {
  id: string;
  side: Side;
  stake: number;
  payout: number;
  marketId: string;
  marketQuestion: string;
  marketRegion: string;
  createdAt: number;
};

export function usePublicTraderBets(userId: string | undefined) {
  return useQuery({
    queryKey: ["public-trader-bets", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase.rpc("get_public_trader_bets", { p_user_id: userId });
      if (error) throw error;
      return ((data as Record<string, unknown>[]) ?? []).map((row) => ({
        id: row.id as string,
        side: row.side as Side,
        stake: Number(row.stake),
        payout: Number(row.payout),
        marketId: row.market_id as string,
        marketQuestion: row.market_question as string,
        marketRegion: row.market_region as string,
        createdAt: new Date(row.created_at as string).getTime(),
      })) satisfies PublicTraderBet[];
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}
