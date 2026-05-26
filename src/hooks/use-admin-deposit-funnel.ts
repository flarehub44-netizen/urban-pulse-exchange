import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DepositFunnelMetrics = {
  since: string;
  counts: Record<string, number>;
  signup_complete: number;
  deposit_paid: number;
  conversion_pct: number;
};

export function useAdminDepositFunnelMetrics(days = 7) {
  return useQuery({
    queryKey: ["admin", "deposit-funnel", days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_get_deposit_funnel_metrics", {
        p_days: days,
      });
      if (error) throw error;
      return data as DepositFunnelMetrics;
    },
    staleTime: 60_000,
  });
}
