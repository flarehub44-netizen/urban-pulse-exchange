import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdminAuth } from "@/integrations/supabase/admin-middleware";
import { adminRpcCall } from "@/actions/admin/_helpers";

export const adminGetUsersListFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) =>
    adminRpcCall("bff.admin.users_list", context, (supabase) =>
      supabase.rpc("get_admin_users_list"),
    ),
  );

export const adminFreezeAccountFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator(z.object({ userId: z.string().uuid(), frozen: z.boolean() }))
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.freeze_account", context, (supabase) =>
      supabase.rpc("admin_freeze_account", {
        p_user_id: data.userId,
        p_frozen: data.frozen,
      }),
    ),
  );

export const adminSetBetLimitFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator(z.object({ userId: z.string().uuid(), limit: z.number().nonnegative() }))
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.set_bet_limit", context, (supabase) =>
      supabase.rpc("admin_set_bet_limit", {
        p_user_id: data.userId,
        p_limit: data.limit,
      }),
    ),
  );

export const adminUpdateKycStatusFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator(
    z.object({
      userId: z.string().uuid(),
      status: z.string(),
      notes: z.string().optional(),
    }),
  )
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.update_kyc", context, (supabase) =>
      supabase.rpc("admin_update_kyc_status", {
        p_user_id: data.userId,
        p_status: data.status,
        p_notes: data.notes,
      }),
    ),
  );
