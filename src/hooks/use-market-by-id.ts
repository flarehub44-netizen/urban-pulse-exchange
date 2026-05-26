import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mapMarket } from "@/hooks/use-markets";
import type { Market } from "@/store/viax-store";

/** Fetch a single platform market by id (bypasses catalog filter; for detail deep links). */
export function useMarketById(marketId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["markets", "by-id", marketId],
    queryFn: async (): Promise<Market | null> => {
      const { data, error } = await supabase
        .from("markets")
        .select("*")
        .eq("id", marketId)
        .eq("archived", false)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return mapMarket(data as Record<string, unknown>);
    },
    enabled: enabled && !!marketId && !marketId.startsWith("cm-"),
    staleTime: 60_000,
    retry: false,
  });
}
