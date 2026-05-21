import { useEffect } from "react";
import { useViaX } from "@/store/viax-store";
import { useMarkets } from "@/hooks/use-markets";

/**
 * Visual heartbeat for demo regions only.
 * Skips pool drift when Supabase markets are loaded (U6).
 */
export function useRealtimeTick(intervalMs = 1600) {
  const tick = useViaX((s) => s.tick);
  const { data: dbMarkets } = useMarkets();

  useEffect(() => {
    if (dbMarkets?.length) return;
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [tick, intervalMs, dbMarkets?.length]);
}
