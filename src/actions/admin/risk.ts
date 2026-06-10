import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdminAuth } from "@/integrations/supabase/admin-middleware.server";
import { getSupabaseCtx } from "@/integrations/supabase/context";
import { getServiceClient } from "@/lib/supabase-service.server";
import { adminRpcCall } from "@/actions/admin/_helpers";
import { logApiMetric } from "@/lib/structured-log.server";

export const adminGetRiskAlertsFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) =>
    adminRpcCall("bff.admin.risk_alerts", context, (supabase) =>
      supabase.rpc("get_admin_risk_alerts"),
    ),
  );

export const adminListCpaFraudCasesFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .inputValidator(z.object({ status: z.string().optional() }))
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.cpa_fraud_cases", context, (supabase) =>
      supabase.rpc("admin_list_cpa_fraud_cases", {
        p_status: data.status,
        p_limit: 250,
      }),
    ),
  );

export const adminListCpaReferralsFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .inputValidator(z.object({ onlyFlagged: z.boolean().optional() }))
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.cpa_referrals", context, (supabase) =>
      supabase.rpc("admin_list_cpa_referrals", {
        p_only_flagged: data.onlyFlagged ?? false,
        p_limit: 250,
      }),
    ),
  );

export const adminPayerDocumentClusterFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .inputValidator(z.object({ userId: z.string().uuid() }))
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.payer_document_cluster", context, (supabase) =>
      supabase.rpc("admin_payer_document_cluster", { p_user_id: data.userId }),
    ),
  );

export const adminListPayerDocumentClustersFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) =>
    adminRpcCall("bff.admin.payer_document_clusters", context, (supabase) =>
      supabase.rpc("admin_list_payer_document_clusters", {
        p_min_accounts: 2,
        p_limit: 50,
      }),
    ),
  );

export const adminTagCpaFraudCaseFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator(
    z.object({
      userId: z.string().uuid(),
      partnerId: z.string().uuid().nullable().optional(),
      status: z.enum(["open", "confirmed", "cleared", "resolved"]).optional(),
      riskScore: z.number().optional(),
      reasons: z.array(z.string()).optional(),
      notes: z.string().optional(),
    }),
  )
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.tag_cpa_fraud", context, (supabase) =>
      supabase.rpc("admin_tag_cpa_fraud_case", {
        p_user_id: data.userId,
        p_partner_id: data.partnerId ?? undefined,
        p_status: data.status ?? "open",
        p_risk_score: data.riskScore ?? 60,
        p_reasons: data.reasons ?? [],
        p_notes: data.notes,
      }),
    ),
  );

export const adminClearCpaFraudCasesFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator(z.object({ actionNote: z.string().min(8) }))
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.clear_cpa_fraud", context, (supabase) =>
      supabase.rpc("admin_clear_cpa_fraud_cases", {
        p_action_note: data.actionNote,
        p_only_confirmed: true,
      }),
    ),
  );

export const adminSuspendCpaFraudPartnersFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator(
    z.object({
      actionNote: z.string().min(8),
      partnerId: z.string().uuid().nullable().optional(),
    }),
  )
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.suspend_cpa_partners", context, (supabase) =>
      supabase.rpc("admin_suspend_cpa_fraud_partners", {
        p_action_note: data.actionNote,
        p_partner_id: data.partnerId ?? undefined,
      }),
    ),
  );

export const adminBanCpaFraudUsersFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator(z.object({ actionNote: z.string().min(8) }))
  .handler(async ({ data, context }) => {
    const started = Date.now();
    const { supabase } = getSupabaseCtx(context);
    const service = getServiceClient();

    const { data: rpcData, error } = await supabase.rpc("admin_ban_cpa_fraud_users", {
      p_action_note: data.actionNote,
      p_only_confirmed: true,
    });

    if (error) {
      logApiMetric("bff.admin.ban_cpa_fraud", { ok: false, durationMs: Date.now() - started });
      throw new Error(error.message);
    }

    const payload = (rpcData ?? {}) as {
      ok?: boolean;
      banned_users?: number;
      user_ids?: string[];
    };

    const userIds = Array.isArray(payload.user_ids) ? payload.user_ids : [];
    const authFailed: string[] = [];
    for (const userId of userIds) {
      const { error: authErr } = await service.auth.admin.updateUserById(userId, {
        ban_duration: "876000h",
      } as never);
      if (authErr) authFailed.push(userId);
    }

    logApiMetric("bff.admin.ban_cpa_fraud", { ok: true, durationMs: Date.now() - started });

    return {
      ok: payload.ok ?? true,
      banned_users: payload.banned_users ?? 0,
      auth_ban_failed: authFailed,
    };
  });
