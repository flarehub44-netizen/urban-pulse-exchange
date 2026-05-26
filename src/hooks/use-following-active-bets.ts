import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Side } from "@/store/viax-store";

export interface FollowingActiveBet {
  betId: string;
  traderId: string;
  traderName: string;
  traderHandle: string;
  traderAvatar: string;
  side: Side;
  marketId: string;
  marketQuestion: string;
  marketRegion: string;
  marketEndsAt: number;
  betCreatedAt: number;
}

export function useFollowingActiveBets() {
  const { userId } = useAuth();

  return useQuery({
    queryKey: ["following-active-bets", userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_following_active_bets");
      if (error) throw error;
      return ((data as Record<string, unknown>[]) ?? []).map((row) => ({
        betId: row.bet_id as string,
        traderId: row.trader_id as string,
        traderName: row.trader_name as string,
        traderHandle: row.trader_handle as string,
        traderAvatar: row.trader_avatar as string,
        side: row.side as Side,
        marketId: row.market_id as string,
        marketQuestion: row.market_question as string,
        marketRegion: row.market_region as string,
        marketEndsAt: new Date(row.market_ends_at as string).getTime(),
        betCreatedAt: new Date(row.bet_created_at as string).getTime(),
      })) satisfies FollowingActiveBet[];
    },
    enabled: !!userId,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
