import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware.server";
import type { SupabaseFnContext } from "@/integrations/supabase/context";
import { supabase } from "@/integrations/supabase/client";
import { publicRateLimitMiddleware } from "@/lib/public-rate-limit-middleware.server";

export type DailyPoll = {
  id: string;
  question: string;
  yes_count: number;
  no_count: number;
  voted: boolean;
  my_vote: boolean | null;
};

/** @public Unauthenticated — today's poll for display before login. */
export const getTodayPollFn = createServerFn({ method: "GET" })
  .middleware([publicRateLimitMiddleware("polls-today", { max: 120, windowMs: 60_000 })])
  .handler(async () => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = (await supabase
      .from("daily_polls")
      .select("id, question, yes_count, no_count")
      .eq("poll_date", today)
      .maybeSingle()) as {
      data: Omit<DailyPoll, "voted" | "my_vote"> | null;
      error: Error | null;
    };

    if (error) {
      console.warn("[polls] Failed to load today's poll:", error.message);
      return null;
    }

    return data ? { ...data, voted: false, my_vote: null } : null;
  } catch (error) {
    console.warn("[polls] Today's poll unavailable:", error);
    return null;
  }
  });

export const voteDailyPollFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ vote: z.boolean() }))
  .handler(async ({ context, data }) => {
    const { supabase } = context as unknown as SupabaseFnContext;
    const { data: res, error } = await supabase.rpc("vote_daily_poll", { p_vote: data.vote });
    if (error) throw new Error(error.message);
    return res as { ok: boolean; xp?: number; reason?: string };
  });
