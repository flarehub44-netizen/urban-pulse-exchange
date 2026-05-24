import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mapFootballMarket } from "@/hooks/use-football-markets";
import type { FootballMarketRow } from "@/hooks/use-football-markets";

export function useFootballRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const ch = supabase
      .channel("football-markets-pool")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "football_markets" },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (!row.id) return;

          queryClient.setQueryData<FootballMarketRow[]>(["football-markets"], (old) => {
            if (!old?.length) return old;
            const patch = {
              pool_home: Number(row.pool_home),
              pool_draw: Number(row.pool_draw),
              pool_away: Number(row.pool_away),
              participants: Number(row.participants),
              status: row.status,
              accept_bets: row.accept_bets,
            };
            return old.map((m) => (m.id === row.id ? { ...m, ...patch } : m));
          });

          queryClient.setQueryData<FootballMarketRow | null>(
            ["football-markets", row.id as string],
            (old) => {
              if (!old) return old;
              return {
                ...old,
                pool_home: Number(row.pool_home),
                pool_draw: Number(row.pool_draw),
                pool_away: Number(row.pool_away),
                participants: Number(row.participants),
                status: row.status as FootballMarketRow["status"],
                accept_bets: Boolean(row.accept_bets),
              };
            },
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(ch);
    };
  }, [queryClient]);
}
