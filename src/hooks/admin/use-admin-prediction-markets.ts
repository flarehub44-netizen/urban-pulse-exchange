import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminCreatePredictionMarketFn,
  adminListPredictionMarketsFn,
  adminResolveOutcomeMarketFn,
  adminUpdatePredictionMarketFn,
  adminVoidPredictionMarketFn,
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

export function useAdminVoidPredictionMarket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminVoidPredictionMarketFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "prediction-markets"] });
      qc.invalidateQueries({ queryKey: ["unified-catalog"] });
    },
  });
}

export function useAdminUpdatePredictionMarket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminUpdatePredictionMarketFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "prediction-markets"] });
      qc.invalidateQueries({ queryKey: ["unified-catalog"] });
    },
  });
}
