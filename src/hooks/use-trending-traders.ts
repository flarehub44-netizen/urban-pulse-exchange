import { useQuery } from "@tanstack/react-query";
import { callUntypedRpc } from "@/integrations/supabase/untyped-rpc";

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

type TrendingTraderRow = {
  user_id: string;
  name: string;
  handle: string;
  avatar: string;
  division: string;
  wins_7d: number | string;
  bets_7d: number | string;
  accuracy_7d: number | string;
};

export function useTrendingTraders(limit = 3) {
  return useQuery<TrendingTrader[], Error>({
    queryKey: ["trending-traders", limit],
    queryFn: async (): Promise<TrendingTrader[]> => {
      const rows = await callUntypedRpc<TrendingTraderRow[]>("get_trending_traders", {
        p_limit: limit,
      });
      return (Array.isArray(rows) ? rows : []).map((r) => ({
        user_id: r.user_id,
        name: r.name,
        handle: r.handle,
        avatar: r.avatar,
        division: r.division,
        wins_7d: Number(r.wins_7d),
        bets_7d: Number(r.bets_7d),
        accuracy_7d: Number(r.accuracy_7d),
      }));
    },
    staleTime: 5 * 60_000,
  });
}
