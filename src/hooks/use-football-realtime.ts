import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mapFootballMarket } from "@/hooks/use-football-markets";
import type { FootballMarketRow } from "@/hooks/use-football-markets";

export function useFootballRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const patchFixture = (
      fixtureId: number,
      fixturePatch: Partial<FootballMarketRow["fixture"]>,
    ) => {
      const applyPatch = (m: FootballMarketRow): FootballMarketRow =>
        m.fixture.api_fixture_id === fixtureId
          ? { ...m, fixture: { ...m.fixture, ...fixturePatch } }
          : m;

      queryClient.setQueryData<FootballMarketRow[]>(["football-markets"], (old) =>
        old?.map(applyPatch),
      );
    };

    const ch = supabase
      .channel("football-realtime", { config: { private: true } })
      // Pool / status changes on football_markets
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "football_markets" },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (!row.id) return;

          const marketPatch = {
            pool_home: Number(row.pool_home),
            pool_draw: Number(row.pool_draw),
            pool_away: Number(row.pool_away),
            participants: Number(row.participants),
            status: row.status as FootballMarketRow["status"],
            accept_bets: Boolean(row.accept_bets),
          };

          queryClient.setQueryData<FootballMarketRow[]>(["football-markets"], (old) =>
            old?.map((m) => (m.id === row.id ? { ...m, ...marketPatch } : m)),
          );

          queryClient.setQueryData<FootballMarketRow | null>(
            ["football-markets", row.id as string],
            (old) => (old ? { ...old, ...marketPatch } : old),
          );
        },
      )
      // Live score / elapsed changes on football_fixtures
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "football_fixtures" },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const fixtureId = Number(row.api_fixture_id);
          if (!fixtureId) return;

          patchFixture(fixtureId, {
            goals_home: row.goals_home != null ? Number(row.goals_home) : null,
            goals_away: row.goals_away != null ? Number(row.goals_away) : null,
            elapsed: row.elapsed != null ? Number(row.elapsed) : null,
            status_short: row.status_short as string,
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(ch);
    };
  }, [queryClient]);
}
