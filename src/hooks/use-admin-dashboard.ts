import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAdminDashboardMetrics(enabled = true) {
  return useQuery({
    queryKey: ["admin", "dashboard-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_dashboard_metrics");
      if (error) throw error;
      return data as {
        volume_today: number;
        revenue_today: number;
        active_markets: number;
        dau: number;
        open_pools: number;
        dispute_count: number;
        lifecycle: Record<string, unknown>;
      };
    },
    enabled,
    staleTime: 15_000,
  });
}

export function useAdminVolumeByHour(enabled = true) {
  return useQuery({
    queryKey: ["admin", "volume-hour"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_volume_by_hour");
      if (error) throw error;
      return (data ?? []) as { hour: string; volume: number }[];
    },
    enabled,
  });
}

export function useAdminLiveFeed(enabled = true) {
  return useQuery({
    queryKey: ["admin", "live-feed"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_live_feed", { p_limit: 30 });
      if (error) throw error;
      return (data ?? []) as { kind: string; ref_id: string; message: string; at: string }[];
    },
    enabled,
    refetchInterval: 30_000,
  });
}

export function useAdminSettlementQueue(enabled = true) {
  return useQuery({
    queryKey: ["admin", "settlement-queue"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_settlement_queue");
      if (error) throw error;
      return (data ?? []) as SettlementRow[];
    },
    enabled,
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

export function useAdminFinance(enabled = true) {
  return useQuery({
    queryKey: ["admin", "finance"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_finance_breakdown");
      if (error) throw error;
      return data as {
        summary: { total_house_revenue: number; entry_count: number };
        by_region: { region: string; volume: number }[];
        by_kind: { kind: string; total: number }[];
      };
    },
    enabled,
  });
}

export function useAdminOracleHealth(enabled = true) {
  return useQuery({
    queryKey: ["admin", "oracle-health"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_oracle_health");
      if (error) throw error;
      return data as {
        regions: {
          id: string;
          name: string;
          flow: number;
          avg_speed: number;
          congestion: number;
          updated_at: string;
        }[];
        recent_snapshots: {
          market_id: string;
          raw_value: number;
          metric: string;
          source: string;
          recorded_at: string;
        }[];
        dispute_rate: number;
      };
    },
    enabled,
  });
}

export function useAdminUsers(enabled = true) {
  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_users_list");
      if (error) throw error;
      return (data ?? []) as AdminUserRow[];
    },
    enabled,
  });
}

export type AdminUserRow = {
  id: string;
  username: string;
  balance: number;
  is_admin: boolean;
  is_partner?: boolean;
  kyc_status: string;
  risk_score: number;
  frozen: boolean;
  bet_limit: number | null;
  volume: number;
};

export function useAdminRiskAlerts(enabled = true) {
  return useQuery({
    queryKey: ["admin", "risk-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_risk_alerts");
      if (error) throw error;
      return (data ?? []) as {
        type: string;
        user_id: string;
        username: string;
        detail: string;
        severity: string;
      }[];
    },
    enabled,
  });
}

export function useAdminPlatformSettings(enabled = true) {
  return useQuery({
    queryKey: ["admin", "platform-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_platform_settings_admin");
      if (error) throw error;
      return (data ?? {}) as Record<string, unknown>;
    },
    enabled,
  });
}

export function useAdminCameras(enabled = true) {
  return useQuery({
    queryKey: ["admin", "cameras"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_cameras");
      if (error) throw error;
      return (data ?? []) as AdminCamera[];
    },
    enabled,
  });
}

export type CameraHealthRow = {
  id: string;
  name: string;
  region_id: string | null;
  status: string;
  detection_ok: boolean;
  stream_host: string | null;
  last_metric_at: string | null;
  minutes_stale: number | null;
  is_stale: boolean;
};

export function useAdminCameraHealth(enabled = true) {
  return useQuery({
    queryKey: ["admin", "camera-health"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_camera_health");
      if (error) throw error;
      return (data ?? []) as CameraHealthRow[];
    },
    enabled,
    refetchInterval: 60_000,
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

export function useVisionWorkerStatus(enabled = true) {
  return useQuery({
    queryKey: ["admin", "vision-worker"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_vision_worker_status");
      if (error) throw error;
      return data as VisionWorkerStatus;
    },
    enabled,
    refetchInterval: 60_000,
  });
}

export type AdminCamera = {
  id: string;
  region_id: string | null;
  name: string;
  location: string | null;
  status: string;
  stream_url: string | null;
  fps: number | null;
  detection_ok: boolean;
  count_line: unknown;
  last_vehicle_count?: number | null;
  last_flow_estimate?: number | null;
  last_metric_at?: string | null;
};

export function useAdminForceClose() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ marketId, note }: { marketId: string; note?: string }) => {
      const { data, error } = await supabase.rpc("admin_force_close", {
        p_market_id: marketId,
        p_note: note ?? undefined,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["markets"] });
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}

export function useAdminReprocess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (marketId: string) => {
      const { data, error } = await supabase.rpc("admin_reprocess_market", {
        p_market_id: marketId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin"] }),
  });
}

export function useAdminPartnerApplications(enabled = true) {
  return useQuery({
    queryKey: ["admin", "partner-applications"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_partner_applications");
      if (error) throw error;
      return (data ?? []) as {
        id: string;
        user_id: string;
        handle: string;
        name: string;
        bio: string;
        focus_city: string | null;
        created_at: string;
      }[];
    },
    enabled,
  });
}

export function useAdminApprovePartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      tier,
      slug,
      revenueSharePct,
      cpaAmount,
    }: {
      userId: string;
      tier?: string;
      slug?: string;
      revenueSharePct?: number;
      cpaAmount?: number | null;
    }) => {
      const { data, error } = await supabase.rpc("admin_approve_partner", {
        p_user_id: userId,
        p_tier: tier ?? "Bronze",
        p_slug: slug ?? undefined,
        p_revenue_share_pct: revenueSharePct ?? undefined,
        p_cpa_amount: cpaAmount ?? undefined,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "partner-applications"] });
      qc.invalidateQueries({ queryKey: ["admin", "active-partners"] });
    },
  });
}

export type AdminActivePartner = {
  user_id: string;
  handle: string;
  name: string;
  slug: string;
  tier: string;
  revenue_share_pct: number;
  cpa_amount: number | null;
  balance: number;
  referrals_count: number;
};

export function useAdminActivePartners(enabled = true) {
  return useQuery({
    queryKey: ["admin", "active-partners"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_active_partners");
      if (error) throw error;
      return (data ?? []) as AdminActivePartner[];
    },
    enabled,
  });
}

export function useAdminUpdatePartnerTerms() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      revenueSharePct,
      cpaAmount,
    }: {
      userId: string;
      revenueSharePct: number;
      cpaAmount: number | null;
    }) => {
      const { data, error } = await supabase.rpc("admin_update_partner_terms", {
        p_user_id: userId,
        p_revenue_share_pct: revenueSharePct,
        p_cpa_amount: cpaAmount,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "active-partners"] }),
  });
}

export function useAdminRejectPartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, note }: { userId: string; note?: string }) => {
      const { data, error } = await supabase.rpc("admin_reject_partner", {
        p_user_id: userId,
        p_note: note ?? undefined,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "partner-applications"] }),
  });
}

export function useAdminUpdateSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      const { data, error } = await supabase.rpc("admin_update_setting", {
        p_key: key,
        p_value: value,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "platform-settings"] }),
  });
}

export function useAdminFreezeAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, frozen }: { userId: string; frozen: boolean }) => {
      const { data, error } = await supabase.rpc("admin_freeze_account", {
        p_user_id: userId,
        p_frozen: frozen,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useAdminSetBetLimit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, limit }: { userId: string; limit: number }) => {
      const { data, error } = await supabase.rpc("admin_set_bet_limit", {
        p_user_id: userId,
        p_limit: limit,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useAdminVolumeByRegion(enabled = true) {
  return useQuery({
    queryKey: ["admin", "volume-by-region"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_volume_by_region");
      if (error) throw error;
      return (data ?? []) as { region: string; volume: number; bet_count: number }[];
    },
    enabled,
  });
}

export function useAdminOpenExposure(enabled = true) {
  return useQuery({
    queryKey: ["admin", "open-exposure"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_open_exposure");
      if (error) throw error;
      return data as {
        open_pool_total: number;
        open_bets_total: number;
        markets_with_bets: number;
      };
    },
    enabled,
  });
}

export function useAdminActionsLog(enabled = true) {
  return useQuery({
    queryKey: ["admin", "actions-log"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_actions_log", { p_limit: 50 });
      if (error) throw error;
      return (data ?? []) as {
        id: number;
        action: string;
        target_type: string | null;
        target_id: string | null;
        payload: Record<string, unknown> | null;
        created_at: string;
        admin_username: string | null;
      }[];
    },
    enabled,
  });
}

export function useAdminExtendMarket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ marketId, hours }: { marketId: string; hours: number }) => {
      const { data, error } = await supabase.rpc("admin_extend_market", {
        p_market_id: marketId,
        p_extra_hours: hours,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["markets"] }),
  });
}

export function useAdminPauseBets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ marketId, paused }: { marketId: string; paused: boolean }) => {
      const { data, error } = await supabase.rpc("admin_pause_bets", {
        p_market_id: marketId,
        p_paused: paused,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["markets"] }),
  });
}

export function useAdminTriggerLifecycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("admin_trigger_lifecycle");
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin"] }),
  });
}

export function useAdminApplySimulator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ rush, rain }: { rush: boolean; rain: boolean }) => {
      const { data, error } = await supabase.rpc("admin_apply_simulator_scenario", {
        p_rush: rush,
        p_rain: rain,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      qc.invalidateQueries({ queryKey: ["regions"] });
    },
  });
}

export function useAdminUpdateKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      status,
      notes,
    }: {
      userId: string;
      status: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase.rpc("admin_update_kyc_status", {
        p_user_id: userId,
        p_status: status,
        p_notes: notes ?? undefined,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useAdminSetCameraStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ cameraId, status }: { cameraId: string; status: string }) => {
      const { data, error } = await supabase.rpc("admin_set_camera_status", {
        p_camera_id: cameraId,
        p_status: status,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "cameras"] }),
  });
}

export function useAdminUpsertCamera() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      p_id: string | null;
      p_region_id: string;
      p_name: string;
      p_location?: string;
      p_status?: string;
      p_stream_url?: string | null;
      p_count_line?: unknown;
    }) => {
      const { data, error } = await supabase.rpc("admin_upsert_camera", {
        p_id: args.p_id,
        p_region_id: args.p_region_id,
        p_name: args.p_name,
        p_location: args.p_location ?? undefined,
        p_status: args.p_status ?? "offline",
        p_stream_url: args.p_stream_url ?? undefined,
        p_count_line: args.p_count_line ?? undefined,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "cameras"] }),
  });
}

export function useAdminCreateCameraUpstream() {
  return useMutation({
    mutationFn: async (args: {
      provider: "der-sp" | "cet-sp" | "motiva" | "custom";
      upstreamUrl: string;
      label?: string;
      kind?: "hls" | "image";
    }) => {
      const { data, error } = await supabase.rpc("admin_create_camera_upstream", {
        p_provider: args.provider,
        p_upstream_url: args.upstreamUrl,
        p_label: args.label ?? undefined,
        p_kind: args.kind ?? "hls",
      });
      if (error) throw error;
      return data as { slug: string; proxy_path: string };
    },
  });
}
