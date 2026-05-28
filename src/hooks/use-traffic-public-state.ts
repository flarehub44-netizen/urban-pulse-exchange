import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mapMarket } from "@/hooks/use-markets";
import type { Market } from "@/store/viax-store";
import type { TrafficEndedMarket } from "@/hooks/use-traffic-ended-markets";
import { mapTrafficEndedRow } from "@/hooks/use-traffic-ended-markets";

export type TrafficPublicState = {
  scheduler: {
    next_starts_at: string | null;
    last_ended_at: string | null;
    event_duration_seconds: number;
    gap_after_end_seconds: number;
  };
  activeMarket: Market | null;
  nextStartsAt: number | null;
  lastEndedAt: number | null;
  recentEnded: TrafficEndedMarket[];
};

export const TRAFFIC_PUBLIC_STATE_KEY = ["traffic-public-state"] as const;

export function useTrafficPublicState() {
  return useQuery({
    queryKey: TRAFFIC_PUBLIC_STATE_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_traffic_public_state");
      if (error) {
        const msg = error.message?.toLowerCase() ?? "";
        if (error.code === "PGRST301" || msg.includes("jwt")) {
          await supabase.auth.signOut();
        }
        throw error;
      }
      const raw = data as {
        scheduler: TrafficPublicState["scheduler"];
        active_market: Record<string, unknown> | null;
        recent_ended: Record<string, unknown>[] | null;
      };
      const nextAt = raw.scheduler?.next_starts_at
        ? new Date(raw.scheduler.next_starts_at as string).getTime()
        : null;
      const lastAt = raw.scheduler?.last_ended_at
        ? new Date(raw.scheduler.last_ended_at as string).getTime()
        : null;
      return {
        scheduler: raw.scheduler,
        activeMarket: raw.active_market
          ? mapMarket(raw.active_market as Record<string, unknown>)
          : null,
        nextStartsAt: nextAt,
        lastEndedAt: lastAt,
        recentEnded: (raw.recent_ended ?? []).map((r) =>
          mapTrafficEndedRow(r as Record<string, unknown>),
        ),
      } satisfies TrafficPublicState;
    },
    refetchInterval: 15_000,
    staleTime: 5_000,
  });
}
