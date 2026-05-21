import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LifecycleHealth {
  last_tick_at: string | null;
  last_tick_ok: boolean;
  last_error: string | null;
  last_payload: Record<string, unknown> | null;
  dispute_count: number;
  stale_minutes: number | null;
}

export interface LedgerSummary {
  total_house_revenue: number;
  entry_count: number;
}

export function useLifecycleHealth(enabled: boolean) {
  return useQuery({
    queryKey: ["lifecycle-health"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_lifecycle_health");
      if (error) throw error;
      return data as LifecycleHealth;
    },
    enabled,
    staleTime: 30_000,
  });
}

export function usePlatformLedgerSummary(enabled: boolean) {
  return useQuery({
    queryKey: ["platform-ledger-summary"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_platform_ledger_summary");
      if (error) throw error;
      return data as LedgerSummary;
    },
    enabled,
    staleTime: 60_000,
  });
}
