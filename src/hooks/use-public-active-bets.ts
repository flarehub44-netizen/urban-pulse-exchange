import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/supabase/loose";
import type { Side } from "@/store/viax-store";

export interface PublicActiveBet {
  id: string;
  side: Side;
  marketId: string;
  marketQuestion: string;
  marketRegion: string;
  marketEndsAt: number;
  createdAt: number;
}

export function usePublicActiveBets(userId: string | undefined) {
  return useQuery({
    queryKey: ["public-active-bets", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await db.rpc("get_public_active_bets", { p_user_id: userId });
      if (error) throw error;
      return ((data as Record<string, unknown>[]) ?? []).map((row) => ({
        id: row.id as string,
        side: row.side as Side,
        marketId: row.market_id as string,
        marketQuestion: row.market_question as string,
        marketRegion: row.market_region as string,
        marketEndsAt: new Date(row.market_ends_at as string).getTime(),
        createdAt: new Date(row.created_at as string).getTime(),
      })) satisfies PublicActiveBet[];
    },
    enabled: !!userId,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
