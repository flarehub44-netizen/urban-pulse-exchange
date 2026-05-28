import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminListMonthlyImpactWinnersFn,
  adminMarkImpactPrizeFulfilledFn,
  type AdminImpactWinnerRow,
} from "@/actions/impact";

export function useAdminMonthlyImpactWinners(month?: string) {
  return useQuery({
    queryKey: ["admin", "impact-winners", month ?? "current"],
    queryFn: async () => {
      const data = await adminListMonthlyImpactWinnersFn({ data: { month } });
      return data as AdminImpactWinnerRow[];
    },
  });
}

export function useAdminMarkImpactPrizeFulfilled() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { winner_id: string; notes?: string }) =>
      adminMarkImpactPrizeFulfilledFn({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "impact-winners"] });
    },
  });
}
