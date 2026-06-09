import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdminAuth } from "@/integrations/supabase/admin-middleware";
import { adminRpcCall } from "@/actions/admin/_helpers";

export const adminGetDashboardMetricsFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) =>
    adminRpcCall("bff.admin.dashboard_metrics", context, (supabase) =>
      supabase.rpc("get_admin_dashboard_metrics"),
    ),
  );

export const adminGetVolumeByHourFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) =>
    adminRpcCall("bff.admin.volume_by_hour", context, (supabase) =>
      supabase.rpc("get_admin_volume_by_hour"),
    ),
  );

export const adminGetLiveFeedFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) =>
    adminRpcCall("bff.admin.live_feed", context, (supabase) =>
      supabase.rpc("get_admin_live_feed", { p_limit: 30 }),
    ),
  );

export const adminGetSettlementQueueFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) =>
    adminRpcCall("bff.admin.settlement_queue", context, (supabase) =>
      supabase.rpc("get_admin_settlement_queue"),
    ),
  );

export const adminGetFinanceBreakdownFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) =>
    adminRpcCall("bff.admin.finance_breakdown", context, (supabase) =>
      supabase.rpc("get_admin_finance_breakdown"),
    ),
  );

export const adminGetOracleHealthFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) =>
    adminRpcCall("bff.admin.oracle_health", context, (supabase) =>
      supabase.rpc("get_admin_oracle_health"),
    ),
  );

export const adminGetVolumeByRegionFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) =>
    adminRpcCall("bff.admin.volume_by_region", context, (supabase) =>
      supabase.rpc("get_admin_volume_by_region"),
    ),
  );

export const adminGetOpenExposureFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) =>
    adminRpcCall("bff.admin.open_exposure", context, (supabase) =>
      supabase.rpc("get_admin_open_exposure"),
    ),
  );

export const adminGetActionsLogFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) =>
    adminRpcCall("bff.admin.actions_log", context, (supabase) =>
      supabase.rpc("get_admin_actions_log", { p_limit: 50 }),
    ),
  );

export const adminGetDepositFunnelMetricsFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .inputValidator(z.object({ days: z.number().int().min(1).max(90).optional() }))
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.deposit_funnel", context, (supabase) =>
      supabase.rpc("admin_get_deposit_funnel_metrics", { p_days: data.days ?? 7 }),
    ),
  );

export const adminGetPlatformSettingsFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) =>
    adminRpcCall("bff.admin.platform_settings", context, (supabase) =>
      supabase.rpc("get_platform_settings_admin"),
    ),
  );

export const adminGetMarketOpsSettingsFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) => {
    const { supabase } = (await import("@/integrations/supabase/context")).getSupabaseCtx(
      context,
    );
    const { data, error } = await supabase
      .from("platform_settings")
      .select("key, value")
      .in("key", [
        "football_enabled",
        "football_betting_close_minutes",
        "football_sync_days_back",
        "football_sync_days_ahead",
        "football_last_sync_run",
        "football_last_resolve_run",
      ]);
    if (error) throw new Error(error.message);
    return Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  });

export const adminGetOpsHealthFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async () => {
    const { runHealthCheck } = await import("@/lib/health-check.server");
    return runHealthCheck();
  });
