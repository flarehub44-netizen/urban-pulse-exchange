import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { callUntypedRpc } from "@/integrations/supabase/untyped-rpc";

export type MarketSearchResult = {
  id: string;
  question: string;
  region: string;
  status: string;
  poolYes: number;
  poolNo: number;
  endsAt: number;
};

type SearchMarketsRow = {
  id: string;
  question: string;
  region: string;
  status: string;
  pool_yes: number;
  pool_no: number;
  ends_at: string | null;
};

export function useMarketSearch(query: string) {
  const debounced = useDebounce(query.trim(), 300);

  return useQuery<MarketSearchResult[], Error>({
    queryKey: ["market-search", debounced],
    queryFn: async (): Promise<MarketSearchResult[]> => {
      if (!debounced || debounced.length < 2) return [];
      const rows = await callUntypedRpc<SearchMarketsRow[]>("search_markets", {
        p_query: debounced,
        p_limit: 8,
      });
      return (Array.isArray(rows) ? rows : []).map((r) => ({
        id: r.id,
        question: r.question,
        region: r.region,
        status: r.status,
        poolYes: Number(r.pool_yes),
        poolNo: Number(r.pool_no),
        endsAt: r.ends_at ? new Date(r.ends_at).getTime() : 0,
      }));
    },
    enabled: debounced.length >= 2,
    staleTime: 15_000,
  });
}
