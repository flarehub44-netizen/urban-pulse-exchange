import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useViaX } from "@/store/viax-store";
import type { Market } from "@/store/viax-store";
import { useMarkets } from "@/hooks/use-markets";
import { animateMarkets } from "@/lib/market-tick";
import { SEED_MARKETS } from "@/store/viax-store";
import { filterCatalogMarkets } from "@/lib/markets-catalog";

/**
 * Visual heartbeat for demo regions and market pools when Supabase has no rows yet.
 */
export function useRealtimeTick(intervalMs = 1600) {
  const tickRegions = useViaX((s) => s.tick);
  const queryClient = useQueryClient();
  const { data: dbMarkets, isFetched } = useMarkets();

  useEffect(() => {
    if (isFetched && dbMarkets && dbMarkets.length > 0) return;

    const id = setInterval(() => {
      tickRegions();
      queryClient.setQueryData<Market[]>(["markets"], (old) =>
        animateMarkets(old ?? filterCatalogMarkets(SEED_MARKETS)),
      );
    }, intervalMs);
    return () => clearInterval(id);
  }, [tickRegions, intervalMs, dbMarkets, isFetched, queryClient]);
}
