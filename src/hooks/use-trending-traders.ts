import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TrendingTrader = {
  user_id: string;
  name: string;
  handle: string;
  avatar: string;
  division: string;
  wins_7d: number;
  bets_7d: number;
  accuracy_7d: number;
};

export function useTrendingTraders(limit = 3) {
  return useQuery({
    queryKey: ["trending-traders", limit],
    queryFn: async (): Promise<TrendingTrader[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)("get_trending_traders", {
        p_limit: limit,
      });
      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];
      return rows.map((r: Record<string, unknown>) => ({
        user_id: r.user_id as string,
        name: r.name as string,
        handle: r.handle as string,
        avatar: r.avatar as string,
        division: r.division as string,
        wins_7d: Number(r.wins_7d),
        bets_7d: Number(r.bets_7d),
        accuracy_7d: Number(r.accuracy_7d),
      }));
    },
    staleTime: 5 * 60_000,
  });
}
