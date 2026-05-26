import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseFnContext } from "@/integrations/supabase/context";
import { supabase } from "@/integrations/supabase/client";
import { mapSupabaseBusinessError } from "@/lib/server-errors";
import { logApiMetric } from "@/lib/structured-log.server";

const placeBetSchema = z.object({
  marketId: z.string(),
  side: z.enum(["YES", "NO"]),
  stake: z.number().positive().max(100_000),
});

export const placeBetFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(placeBetSchema)
  .handler(async ({ data, context }) => {
    const started = Date.now();
    const { supabase } = context as unknown as SupabaseFnContext;
    const { data: result, error } = await supabase.rpc("place_bet", {
      p_market_id: data.marketId,
      p_side: data.side,
      p_stake: data.stake,
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
      progress?: {
        xp?: number;
        xp_delta?: number;
        achievements_unlocked?: { id: string; name: string; description: string }[];
      };
    };
  });

export const saveBetNoteFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { bet_id: string; note: string }) => d)
  .handler(async ({ data }) => {
    const { error } = await supabase
      .from("bets")
      .update({ note: data.note.trim().slice(0, 280) })
      .eq("id", data.bet_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
