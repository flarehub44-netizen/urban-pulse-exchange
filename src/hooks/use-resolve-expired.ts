import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
      queryClient.invalidateQueries({ queryKey: ["bets"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };

    const channel = supabase
      .channel("markets-lifecycle")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "markets" },
        () => {
          if (!cancelled) invalidate();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
