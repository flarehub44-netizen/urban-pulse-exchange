import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdminAuth } from "@/integrations/supabase/admin-middleware.server";
import { adminRpcCall } from "@/actions/admin/_helpers";

export const adminForceCloseFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator(z.object({ marketId: z.string(), note: z.string().optional() }))
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.force_close", context, (supabase) =>
      supabase.rpc("admin_force_close", {
        p_market_id: data.marketId,
        p_note: data.note,
      }),
    ),
  );

export const adminReprocessMarketFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator(z.object({ marketId: z.string() }))
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.reprocess_market", context, (supabase) =>
      supabase.rpc("admin_reprocess_market", { p_market_id: data.marketId }),
    ),
  );

export const adminResolveMarketFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator(
    z.object({
      marketId: z.string(),
      winningSide: z.enum(["YES", "NO"]),
      note: z.string().optional(),
    }),
  )
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.resolve_market", context, (supabase) =>
      supabase.rpc("admin_resolve_market", {
        p_market_id: data.marketId,
        p_winning_side: data.winningSide,
        p_note: data.note,
      }),
    ),
  );

export const adminExtendMarketFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator(z.object({ marketId: z.string(), hours: z.number().positive() }))
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.extend_market", context, (supabase) =>
      supabase.rpc("admin_extend_market", {
        p_market_id: data.marketId,
        p_extra_hours: data.hours,
      }),
    ),
  );

export const adminPauseBetsFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator(z.object({ marketId: z.string(), paused: z.boolean() }))
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.pause_bets", context, (supabase) =>
      supabase.rpc("admin_pause_bets", {
        p_market_id: data.marketId,
        p_paused: data.paused,
      }),
    ),
  );

export const adminTriggerLifecycleFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) =>
    adminRpcCall("bff.admin.trigger_lifecycle", context, (supabase) =>
      supabase.rpc("admin_trigger_lifecycle"),
    ),
  );

export const adminApplySimulatorScenarioFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator(z.object({ rush: z.boolean(), rain: z.boolean() }))
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.simulator_scenario", context, (supabase) =>
      supabase.rpc("admin_apply_simulator_scenario", {
        p_rush: data.rush,
        p_rain: data.rain,
      }),
    ),
  );
