import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useMarketHistory(marketId: string) {
  return useQuery({
    queryKey: ["market_history", marketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("market_history")
        .select("p, recorded_at")
        .eq("market_id", marketId)
        .order("recorded_at", { ascending: true })
        .limit(100);
      if (error) throw error;
      return (data ?? []).map((row) => ({
        t: new Date(row.recorded_at).getTime(),
        p: Number(row.p),
      }));
    },
    staleTime: 5_000,
    enabled: !!marketId,
  });
}
