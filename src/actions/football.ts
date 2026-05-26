import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseFnContext } from "@/integrations/supabase/context";

const placeFootballBetSchema = z.object({
  marketId: z.string(),
  outcome: z.enum(["HOME", "DRAW", "AWAY"]),
  stake: z.number().positive().max(100_000),
});

export const placeFootballBetFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(placeFootballBetSchema)
  .handler(async ({ data, context }) => {
    const { supabase } = context as unknown as SupabaseFnContext;
    const { data: result, error } = await supabase.rpc("place_football_bet", {
      p_market_id: data.marketId,
      p_outcome: data.outcome,
      p_stake: data.stake,
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
