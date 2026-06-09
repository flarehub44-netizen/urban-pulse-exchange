import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  adminApplySimulatorScenarioFn,
  adminExtendMarketFn,
  adminForceCloseFn,
  adminPauseBetsFn,
  adminReprocessMarketFn,
  adminTriggerLifecycleFn,
} from "@/actions/admin/settlement";

export function useAdminForceClose() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ marketId, note }: { marketId: string; note?: string }) =>
      adminForceCloseFn({ data: { marketId, note } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["markets"] });
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}

export function useAdminReprocess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (marketId: string) => adminReprocessMarketFn({ data: { marketId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin"] }),
  });
}

export function useAdminExtendMarket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ marketId, hours }: { marketId: string; hours: number }) =>
      adminExtendMarketFn({ data: { marketId, hours } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["markets"] }),
  });
}

export function useAdminPauseBets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ marketId, paused }: { marketId: string; paused: boolean }) =>
      adminPauseBetsFn({ data: { marketId, paused } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["markets"] }),
  });
}

export function useAdminTriggerLifecycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => adminTriggerLifecycleFn(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin"] }),
  });
}

export function useAdminApplySimulator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rush, rain }: { rush: boolean; rain: boolean }) =>
      adminApplySimulatorScenarioFn({ data: { rush, rain } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      qc.invalidateQueries({ queryKey: ["regions"] });
    },
  });
}
