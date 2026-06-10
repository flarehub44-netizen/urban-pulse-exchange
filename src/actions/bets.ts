import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware.server";
import { getSupabaseCtx } from "@/integrations/supabase/context";
import { mapSupabaseBusinessError } from "@/lib/server-errors";
import { logApiMetric } from "@/lib/structured-log.server";

export const placeBetSchema = z.object({
  marketId: z.string(),
  side: z.enum(["YES", "NO"]),
  stake: z.number().positive().max(100_000),
  idempotencyKey: z.string().uuid(),
});

export const placeBetFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(placeBetSchema)
  .handler(async ({ data, context }) => {
    const started = Date.now();
    const { supabase } = getSupabaseCtx(context);
    const { data: result, error } = await supabase.rpc("place_bet", {
      p_market_id: data.marketId,
      p_side: data.side,
      p_stake: data.stake,
      p_idempotency_key: data.idempotencyKey,
    });
    if (error) {
      logApiMetric("bff.place_bet", { ok: false, durationMs: Date.now() - started });
      throw mapSupabaseBusinessError(error.message);
    }
    logApiMetric("bff.place_bet", { ok: true, durationMs: Date.now() - started });
    return result as {
      bet_id: string;
      tx_id: string;
      pool_yes: number;
      pool_no: number;
      balance: number;
      idempotent?: boolean;
      progress?: {
        xp?: number;
        xp_delta?: number;
        achievements_unlocked?: { id: string; name: string; description: string }[];
      };
    };
  });

export const saveBetNoteFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ bet_id: z.string().uuid(), note: z.string().max(280) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = getSupabaseCtx(context);
    const { error } = await supabase
      .from("bets")
      .update({ note: data.note.trim().slice(0, 280) })
      .eq("id", data.bet_id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
