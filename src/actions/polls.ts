import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseFnContext } from "@/integrations/supabase/loose";
import { db } from "@/integrations/supabase/loose";

export type DailyPoll = {
  id: string;
  question: string;
  yes_count: number;
  no_count: number;
  voted: boolean;
  my_vote: boolean | null;
};

export const getTodayPollFn = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = (await db
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
  .inputValidator((d: { vote: boolean }) => d)
  .handler(async ({ context, data }) => {
    const { supabase } = context as unknown as SupabaseFnContext;
    const { data: res, error } = await supabase.rpc("vote_daily_poll", { p_vote: data.vote });
    if (error) throw new Error(error.message);
    return res as { ok: boolean; xp?: number; reason?: string };
  });
