import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdminAuth } from "@/integrations/supabase/admin-middleware";
import type { Json } from "@/integrations/supabase/types";
import { adminRpcCall } from "@/actions/admin/_helpers";

export const adminGetBonusOverviewFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .inputValidator(z.object({ days: z.number().int().optional() }))
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.bonus_overview", context, (supabase) =>
      supabase.rpc("get_admin_bonus_overview", { p_days: data.days ?? 30 }),
    ),
  );

export const adminGetBonusLedgerFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .inputValidator(z.object({ limit: z.number().int().optional() }))
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.bonus_ledger", context, (supabase) =>
      supabase.rpc("get_admin_bonus_ledger", { p_limit: data.limit ?? 100 }),
    ),
  );

export const adminGrantUserBonusFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator(
    z.object({
      userId: z.string().uuid(),
      amount: z.number().positive(),
      kind: z.enum(["balance", "xp"]),
      reason: z.string().optional(),
    }),
  )
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.grant_user_bonus", context, (supabase) =>
      supabase.rpc("admin_grant_user_bonus", {
        p_user_id: data.userId,
        p_amount: data.amount,
        p_kind: data.kind,
        p_reason: data.reason,
      }),
    ),
  );

export const adminUpdateCasinoSpinWeightsFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator(z.object({ weights: z.array(z.record(z.unknown())) }))
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.casino_spin_weights", context, (supabase) =>
      supabase.rpc("admin_update_casino_spin_weights", {
        p_weights: data.weights as Json,
      }),
    ),
  );
