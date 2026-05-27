import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getSupabaseCtx } from "@/integrations/supabase/context";

function getServiceClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error("Supabase service role not configured");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

const banSchema = z.object({
  actionNote: z.string().min(8),
});

export const adminBanCpaFraudUsersFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(banSchema)
  .handler(async ({ data, context }) => {
    const { supabase } = getSupabaseCtx(context);
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
