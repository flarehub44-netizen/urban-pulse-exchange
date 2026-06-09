import { useQuery } from "@tanstack/react-query";
import {
  adminGetActionsLogFn,
  adminGetDashboardMetricsFn,
  adminGetFinanceBreakdownFn,
  adminGetLiveFeedFn,
  adminGetOpenExposureFn,
  adminGetOpsHealthFn,
  adminGetOracleHealthFn,
  adminGetSettlementQueueFn,
  adminGetVolumeByHourFn,
  adminGetVolumeByRegionFn,
} from "@/actions/admin/dashboard";

export function useAdminDashboardMetrics(enabled = true) {
  return useQuery({
    queryKey: ["admin", "dashboard-metrics"],
    queryFn: () => adminGetDashboardMetricsFn(),
    enabled,
    staleTime: 15_000,
  });
}

export function useAdminVolumeByHour(enabled = true) {
  return useQuery({
    queryKey: ["admin", "volume-hour"],
    queryFn: () => adminGetVolumeByHourFn(),
    enabled,
  });
}

export function useAdminLiveFeed(enabled = true) {
  return useQuery({
    queryKey: ["admin", "live-feed"],
    queryFn: () => adminGetLiveFeedFn(),
    enabled,
    refetchInterval: 30_000,
  });
}

export type SettlementRow = {
  id: string;
  question: string;
  region: string;
  status: string;
  pool_yes: number;
  pool_no: number;
  resolved: string | null;
  ai_side: string | null;
  ends_at: string | null;
  snapshot_count: number;
  last_oracle_value: number | null;
};

export function useAdminSettlementQueue(enabled = true) {
  return useQuery({
    queryKey: ["admin", "settlement-queue"],
    queryFn: () => adminGetSettlementQueueFn() as Promise<SettlementRow[]>,
    enabled,
  });
}

export function useAdminFinance(enabled = true) {
  return useQuery({
    queryKey: ["admin", "finance"],
    queryFn: () => adminGetFinanceBreakdownFn(),
    enabled,
  });
}

export function useAdminOracleHealth(enabled = true) {
  return useQuery({
    queryKey: ["admin", "oracle-health"],
    queryFn: () => adminGetOracleHealthFn(),
    enabled,
  });
}

export function useAdminVolumeByRegion(enabled = true) {
  return useQuery({
    queryKey: ["admin", "volume-by-region"],
    queryFn: () => adminGetVolumeByRegionFn(),
    enabled,
  });
}

export function useAdminOpenExposure(enabled = true) {
  return useQuery({
    queryKey: ["admin", "open-exposure"],
    queryFn: () => adminGetOpenExposureFn(),
    enabled,
  });
}

export function useAdminActionsLog(enabled = true) {
  return useQuery({
    queryKey: ["admin", "actions-log"],
    queryFn: () => adminGetActionsLogFn(),
    enabled,
  });
}

export function useAdminOpsHealth(enabled = true) {
  return useQuery({
    queryKey: ["admin", "ops-health"],
    queryFn: () => adminGetOpsHealthFn(),
    enabled,
    refetchInterval: 60_000,
  });
}
