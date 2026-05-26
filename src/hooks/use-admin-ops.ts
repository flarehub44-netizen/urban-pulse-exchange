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
  return useQuery<LifecycleHealth, Error>({
    queryKey: ["lifecycle-health"],
    queryFn: async (): Promise<LifecycleHealth> => {
      const { data, error } = await supabase.rpc("get_lifecycle_health");
      if (error) throw error;
      return data as unknown as LifecycleHealth;
    },
    enabled,
    staleTime: 30_000,
  });
}

export function usePlatformLedgerSummary(enabled: boolean) {
  return useQuery<LedgerSummary, Error>({
    queryKey: ["platform-ledger-summary"],
    queryFn: async (): Promise<LedgerSummary> => {
      const { data, error } = await supabase.rpc("get_platform_ledger_summary");
      if (error) throw error;
      return data as unknown as LedgerSummary;
    },
    enabled,
    staleTime: 60_000,
  });
}
