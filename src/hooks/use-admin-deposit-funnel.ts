import { useQuery } from "@tanstack/react-query";
import { adminGetDepositFunnelMetricsFn } from "@/actions/admin/dashboard";

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
    queryFn: () =>
      adminGetDepositFunnelMetricsFn({
        data: { days },
      }) as Promise<DepositFunnelMetrics>,
    staleTime: 60_000,
  });
}
