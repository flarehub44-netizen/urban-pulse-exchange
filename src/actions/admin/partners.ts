import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdminAuth } from "@/integrations/supabase/admin-middleware.server";
import type { Json } from "@/integrations/supabase/types";
import { adminRpcCall } from "@/actions/admin/_helpers";
import { adminUpdateSettingSchema } from "@/lib/platform-settings-keys";

export const adminListPartnerApplicationsFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) =>
    adminRpcCall("bff.admin.partner_applications", context, (supabase) =>
      supabase.rpc("admin_list_partner_applications"),
    ),
  );

export const adminListActivePartnersFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) =>
    adminRpcCall("bff.admin.active_partners", context, (supabase) =>
      supabase.rpc("admin_list_active_partners"),
    ),
  );

export const adminApprovePartnerFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator(
    z.object({
      userId: z.string().uuid(),
      tier: z.string().optional(),
      slug: z.string().optional(),
      revenueSharePct: z.number().optional(),
      cpaAmount: z.number().nullable().optional(),
      subCreatorsEnabled: z.boolean().optional(),
    }),
  )
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.approve_partner", context, (supabase) =>
      supabase.rpc("admin_approve_partner", {
        p_user_id: data.userId,
        p_tier: data.tier ?? "Bronze",
        p_slug: data.slug,
        p_revenue_share_pct: data.revenueSharePct,
        p_cpa_amount: data.cpaAmount ?? undefined,
        p_sub_creators_enabled: data.subCreatorsEnabled ?? false,
      }),
    ),
  );

export const adminRejectPartnerFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator(z.object({ userId: z.string().uuid(), note: z.string().optional() }))
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.reject_partner", context, (supabase) =>
      supabase.rpc("admin_reject_partner", {
        p_user_id: data.userId,
        p_note: data.note,
      }),
    ),
  );

export const adminUpdatePartnerTermsFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator(
    z.object({
      userId: z.string().uuid(),
      revenueSharePct: z.number(),
      cpaAmount: z.number().nullable(),
    }),
  )
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.update_partner_terms", context, (supabase) =>
      supabase.rpc("admin_update_partner_terms", {
        p_user_id: data.userId,
        p_revenue_share_pct: data.revenueSharePct,
        p_cpa_amount: data.cpaAmount ?? undefined,
      }),
    ),
  );

export const adminSetPartnerSubCreatorsFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator(z.object({ userId: z.string().uuid(), enabled: z.boolean() }))
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.set_partner_sub_creators", context, (supabase) =>
      supabase.rpc("admin_set_partner_sub_creators", {
        p_user_id: data.userId,
        p_enabled: data.enabled,
      }),
    ),
  );

export const adminUpdateSettingFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator(adminUpdateSettingSchema)
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.update_setting", context, (supabase) =>
      supabase.rpc("admin_update_setting", {
        p_key: data.key,
        p_value: data.value as Json,
      }),
    ),
  );
