import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdminAuth } from "@/integrations/supabase/admin-middleware";
import { adminRpcCall } from "@/actions/admin/_helpers";

export const adminListFootballPendingFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .inputValidator(
    z.object({
      date: z.string().optional(),
      limit: z.number().int().optional(),
    }),
  )
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.football_pending", context, (supabase) =>
      supabase.rpc("admin_list_football_pending", {
        p_limit: data.limit ?? 100,
        p_date: data.date,
      }),
    ),
  );

export const adminListFootballDraftsFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .inputValidator(z.object({ limit: z.number().int().optional() }))
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.football_drafts", context, (supabase) =>
      supabase.rpc("admin_list_football_drafts", { p_limit: data.limit ?? 100 }),
    ),
  );

export const adminListFootballLiveFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .inputValidator(z.object({ limit: z.number().int().optional() }))
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.football_live", context, (supabase) =>
      supabase.rpc("admin_list_football_live", { p_limit: data.limit ?? 100 }),
    ),
  );

export const adminApproveFootballFixtureFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator(z.object({ fixtureId: z.number().int() }))
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.approve_football_fixture", context, (supabase) =>
      supabase.rpc("admin_approve_football_fixture", { p_fixture_id: data.fixtureId }),
    ),
  );

export const adminRejectFootballFixtureFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator(
    z.object({ fixtureId: z.number().int(), reason: z.string().optional() }),
  )
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.reject_football_fixture", context, (supabase) =>
      supabase.rpc("admin_reject_football_fixture", {
        p_fixture_id: data.fixtureId,
        p_reason: data.reason,
      }),
    ),
  );

export const adminPublishFootballMarketFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator(z.object({ marketId: z.string() }))
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.publish_football_market", context, (supabase) =>
      supabase.rpc("admin_publish_football_market", { p_market_id: data.marketId }),
    ),
  );

export const adminVoidFootballMarketFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator(
    z.object({ marketId: z.string(), reason: z.string().optional() }),
  )
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.void_football_market", context, (supabase) =>
      supabase.rpc("admin_void_football_market", {
        p_market_id: data.marketId,
        p_reason: data.reason ?? "admin_void",
      }),
    ),
  );

export const adminDeleteFootballMarketFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator(z.object({ marketId: z.string() }))
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.delete_football_market", context, (supabase) =>
      supabase.rpc("admin_delete_football_market" as never, {
        p_market_id: data.marketId,
      } as never),
    ),
  );
