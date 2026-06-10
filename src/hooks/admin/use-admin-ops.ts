import { useQuery } from "@tanstack/react-query";
import { adminGetMarketOpsSettingsFn, adminGetPlatformSettingsFn } from "@/actions/admin/dashboard";
import { adminGetEventsHubOverviewFn } from "@/actions/admin/events";
import { adminGetCameraHealthFn, adminGetVisionWorkerStatusFn } from "@/actions/admin/cameras";

type OpsRunStatus = {
  at: string;
  ok: boolean;
  processed?: number;
  errorsCount?: number;
  notes?: string;
};

export function useAdminPlatformSettings(enabled = true) {
  return useQuery({
    queryKey: ["admin", "platform-settings"],
    queryFn: () => adminGetPlatformSettingsFn() as Promise<Record<string, unknown>>,
    enabled,
  });
}

export function useAdminMarketOpsStatus(enabled = true) {
  return useQuery({
    queryKey: ["admin", "market-ops-status"],
    queryFn: async () => {
      const [settings, overview] = await Promise.all([
        adminGetMarketOpsSettingsFn(),
        adminGetEventsHubOverviewFn(),
      ]);

      const footballSync = (settings.football_last_sync_run ?? null) as OpsRunStatus | null;
      const footballResolve = (settings.football_last_resolve_run ?? null) as OpsRunStatus | null;
      const eventsOverview = overview as {
        markets: { live: number; dispute: number; draft: number };
        football: { pending_fixtures: number };
        community: { pending_reports: number };
      };

      return {
        football: {
          enabled: Boolean(settings.football_enabled ?? true),
          closeMinutes: Number(settings.football_betting_close_minutes ?? 5),
          syncDaysBack: Number(settings.football_sync_days_back ?? 1),
          syncDaysAhead: Number(settings.football_sync_days_ahead ?? 1),
          lastSyncRun: footballSync,
          lastResolveRun: footballResolve,
          pendingFixtures: eventsOverview.football.pending_fixtures ?? 0,
        },
        traffic: {
          liveMarkets: eventsOverview.markets.live ?? 0,
          disputeMarkets: eventsOverview.markets.dispute ?? 0,
          draftMarkets: eventsOverview.markets.draft ?? 0,
        },
        community: {
          pendingReports: eventsOverview.community.pending_reports ?? 0,
        },
      };
    },
    enabled,
    refetchInterval: 30_000,
  });
}

export type VisionWorkerStatus = {
  has_runs: boolean;
  healthy: boolean;
  message?: string;
  last_run_at?: string;
  minutes_since?: number;
  source?: string;
  cameras_total?: number;
  cameras_ok?: number;
  cameras_failed?: number;
  error_summary?: string | null;
};

export function useAdminCameraHealth(enabled = true) {
  return useQuery({
    queryKey: ["admin", "camera-health"],
    queryFn: () => adminGetCameraHealthFn(),
    enabled,
    refetchInterval: 60_000,
  });
}

export function useVisionWorkerStatus(enabled = true) {
  return useQuery({
    queryKey: ["admin", "vision-worker"],
    queryFn: () => adminGetVisionWorkerStatusFn() as Promise<VisionWorkerStatus>,
    enabled,
    refetchInterval: 60_000,
  });
}
