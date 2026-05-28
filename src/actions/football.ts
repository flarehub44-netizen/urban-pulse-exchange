import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getSupabaseCtx } from "@/integrations/supabase/context";

const placeFootballBetSchema = z.object({
  marketId: z.string(),
  outcome: z.enum(["HOME", "DRAW", "AWAY"]),
  stake: z.number().positive().max(100_000),
  idempotencyKey: z.string().uuid(),
});

export const placeFootballBetFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(placeFootballBetSchema)
  .handler(async ({ data, context }) => {
    const { supabase } = getSupabaseCtx(context);
    const { data: result, error } = await supabase.rpc("place_football_bet", {
      p_market_id: data.marketId,
      p_outcome: data.outcome,
      p_stake: data.stake,
      p_idempotency_key: data.idempotencyKey,
    });
    if (error) throw new Error(error.message);
    return result as {
      bet_id: string;
      tx_id: string;
      pool_home: number;
      pool_draw: number;
      pool_away: number;
      balance: number;
    };
  });
