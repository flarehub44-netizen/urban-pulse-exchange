import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/use-debounce";

export type MarketSearchResult = {
  id: string;
  question: string;
  region: string;
  status: string;
  poolYes: number;
  poolNo: number;
  endsAt: number;
};

export function useMarketSearch(query: string) {
  const debounced = useDebounce(query.trim(), 300);

  return useQuery({
    queryKey: ["market-search", debounced],
    queryFn: async (): Promise<MarketSearchResult[]> => {
      if (!debounced || debounced.length < 2) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)("search_markets", {
        p_query: debounced,
        p_limit: 8,
      });
      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];
      return rows.map((r: Record<string, unknown>) => ({
        id: r.id as string,
        question: r.question as string,
        region: r.region as string,
        status: r.status as string,
        poolYes: Number(r.pool_yes),
        poolNo: Number(r.pool_no),
        endsAt: r.ends_at ? new Date(r.ends_at as string).getTime() : 0,
      }));
    },
    enabled: debounced.length >= 2,
    staleTime: 15_000,
  });
}
