import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware.server";
import { getSupabaseCtx } from "@/integrations/supabase/context";
import { logApiMetric } from "@/lib/structured-log.server";
import { mapSupabaseBusinessError } from "@/lib/server-errors";

export const placeOutcomeBetSchema = z.object({
  marketId: z.string().min(1),
  outcomeId: z.string().uuid(),
  stake: z.number().positive().max(100_000),
  idempotencyKey: z.string().uuid().optional(),
});

export const placeOutcomeBetFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(placeOutcomeBetSchema)
  .handler(async ({ data, context }) => {
    const started = Date.now();
    const { supabase } = getSupabaseCtx(context);
    const { data: result, error } = await supabase.rpc("place_outcome_bet", {
      p_market_id: data.marketId,
      p_outcome_id: data.outcomeId,
      p_stake: data.stake,
      p_idempotency_key: data.idempotencyKey ?? null,
    });
    if (error) {
      logApiMetric("bff.place_outcome_bet", { ok: false, durationMs: Date.now() - started });
      throw mapSupabaseBusinessError(error.message);
    }
    logApiMetric("bff.place_outcome_bet", { ok: true, durationMs: Date.now() - started });
    return result;
  });
