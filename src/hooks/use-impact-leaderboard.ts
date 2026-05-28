import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MonthlyImpactLeaderboard } from "@/actions/impact";
import { getMyEventImpactSummaryFn } from "@/actions/impact";

export function useMonthlyImpactLeaderboard(month?: string, limit = 50) {
  return useQuery({
    queryKey: ["impact-leaderboard", month ?? "current", limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_monthly_impact_leaderboard", {
        p_month: month ?? undefined,
        p_limit: limit,
      });
      if (error) throw error;
      return data as MonthlyImpactLeaderboard;
    },
    staleTime: 60_000,
  });
}

export function useMyEventImpactSummary(enabled = true) {
  return useQuery({
    queryKey: ["my-event-impact-summary"],
    queryFn: () => getMyEventImpactSummaryFn(),
    enabled,
    staleTime: 60_000,
  });
}
