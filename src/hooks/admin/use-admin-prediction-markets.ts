import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminCreatePredictionMarketFn,
  adminListPredictionMarketsFn,
  adminResolveOutcomeMarketFn,
} from "@/actions/admin/prediction-markets";

export function useAdminPredictionMarkets(enabled = true) {
  return useQuery({
    queryKey: ["admin", "prediction-markets"],
    queryFn: () => adminListPredictionMarketsFn(),
    enabled,
  });
}

export function useAdminCreatePredictionMarket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminCreatePredictionMarketFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "prediction-markets"] });
      qc.invalidateQueries({ queryKey: ["unified-catalog"] });
    },
  });
}

export function useAdminResolveOutcomeMarket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminResolveOutcomeMarketFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "prediction-markets"] });
      qc.invalidateQueries({ queryKey: ["unified-catalog"] });
    },
  });
}
