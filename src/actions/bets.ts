import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseFnContext } from "@/integrations/supabase/loose";

const placeBetSchema = z.object({
  marketId: z.string(),
  side: z.enum(["YES", "NO"]),
  stake: z.number().positive().max(100_000),
});

export const placeBetFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(placeBetSchema)
  .handler(async ({ data, context }) => {
    const { supabase } = context as SupabaseFnContext;
    const { data: result, error } = await supabase.rpc("place_bet", {
      p_market_id: data.marketId,
      p_side: data.side,
      p_stake: data.stake,
    });
    if (error) throw new Error(error.message);
    return result as {
      bet_id: string;
      tx_id: string;
      pool_yes: number;
      pool_no: number;
      balance: number;
    };
  });
