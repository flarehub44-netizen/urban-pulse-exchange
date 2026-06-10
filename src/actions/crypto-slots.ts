import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware.server";
import { getSupabaseCtx } from "@/integrations/supabase/context";
import { logApiMetric } from "@/lib/structured-log.server";
import { mapSupabaseBusinessError } from "@/lib/server-errors";
import { getServiceClient } from "@/lib/supabase-service.server";
import { parseCatalogMarkets } from "@/lib/catalog-market";

export const placeCryptoSlotBetSchema = z.object({
  marketId: z.string().min(1),
  side: z.enum(["up", "down"]),
  stake: z.number().positive().max(100_000),
});

export const placeCryptoSlotBetFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(placeCryptoSlotBetSchema)
  .handler(async ({ data, context }) => {
    const started = Date.now();
    const { supabase } = getSupabaseCtx(context);
    const { data: result, error } = await supabase.rpc("place_crypto_slot_bet", {
      p_market_id: data.marketId,
      p_side: data.side,
      p_stake: data.stake,
    });
    if (error) {
      logApiMetric("bff.place_crypto_slot_bet", { ok: false, durationMs: Date.now() - started });
      throw mapSupabaseBusinessError(error.message);
    }
    logApiMetric("bff.place_crypto_slot_bet", { ok: true, durationMs: Date.now() - started });
    return result;
  });

export const getActiveCryptoSlotFn = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServiceClient();
  const { data, error } = await supabase.rpc("list_catalog_markets", {
    p_vertical: "crypto",
    p_topic: "up-down",
    p_status: "live",
    p_sort: "closing",
    p_limit: 1,
    p_offset: 0,
  });
  if (error) throw error;
  const markets = parseCatalogMarkets(data);
  return markets.find((m) => m.type === "crypto_slot") ?? null;
});
