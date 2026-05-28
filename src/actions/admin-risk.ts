import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getSupabaseCtx } from "@/integrations/supabase/context";
import { getServiceClient } from "@/lib/supabase-service.server";

const banSchema = z.object({
  actionNote: z.string().min(8),
});

export const adminBanCpaFraudUsersFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(banSchema)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = getSupabaseCtx(context);
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .single();
    if (!profile?.is_admin) throw new Error("Admin only");
    const service = getServiceClient();

    const { data: rpcData, error } = await supabase.rpc("admin_ban_cpa_fraud_users", {
      p_action_note: data.actionNote,
      p_only_confirmed: true,
    });

    if (error) throw new Error(error.message);

    const payload = (rpcData ?? {}) as {
      ok?: boolean;
      banned_users?: number;
      user_ids?: string[];
    };

    const userIds = Array.isArray(payload.user_ids) ? payload.user_ids : [];
    const authFailed: string[] = [];
    for (const userId of userIds) {
      const { error: authErr } = await service.auth.admin.updateUserById(userId, {
        // Campo suportado pela Admin API do GoTrue para bloquear login por duração.
        ban_duration: "876000h",
      } as never);
      if (authErr) {
        authFailed.push(userId);
      }
    }

    return {
      ok: payload.ok ?? true,
      banned_users: payload.banned_users ?? 0,
      auth_ban_failed: authFailed,
    };
  });
