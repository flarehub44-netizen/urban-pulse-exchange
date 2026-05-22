import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/supabase/loose";
import { useEffect } from "react";
import { recordMarketViewFn } from "@/actions/retention";
import { useAnonAuth } from "@/hooks/use-anon-auth";

export type RecentBet = {
  name: string;
  handle: string;
  side: "YES" | "NO";
  stake: number;
  created_at: string;
};

export type MarketSocialProof = {
  viewers: number;
  momentum: number;
  recent_bets: RecentBet[];
};

export function useMarketSocialProof(marketId: string | undefined) {
  const { userId } = useAnonAuth();

  // Registrar visualização ao montar
  useEffect(() => {
    if (!marketId || !userId) return;
    recordMarketViewFn({ data: { market_id: marketId } }).catch(() => null);
  }, [marketId, userId]);

  return useQuery({
    queryKey: ["market-social-proof", marketId],
    queryFn: async () => {
      const { data, error } = await db.rpc("get_market_social_proof", {
        p_market_id: marketId!,
      });
      if (error) throw error;
      return data as MarketSocialProof;
    },
    enabled: !!marketId && !!userId,
    refetchInterval: 15_000,
    staleTime: 10_000,
  });
}
