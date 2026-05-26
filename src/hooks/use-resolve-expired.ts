import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { invalidateAllUserQueries } from "@/lib/query-invalidation";

/**
 * UI refresh only — lifecycle runs on pg_cron (`tick_market_lifecycle`).
 * Realtime invalidates queries when markets change status.
 */
export function useResolveExpired() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ["markets"] });
      invalidateAllUserQueries(queryClient);
    };

    const channel = supabase
      .channel("markets-lifecycle", { config: { private: true } })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "markets" }, () => {
        if (!cancelled) invalidate();
      })
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
