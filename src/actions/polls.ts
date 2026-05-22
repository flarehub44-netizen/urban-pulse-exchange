import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseFnContext } from "@/integrations/supabase/loose";

export type DailyPoll = {
  id: string;
  question: string;
  yes_count: number;
  no_count: number;
  voted: boolean;
  my_vote: boolean | null;
};

export const getTodayPollFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context as SupabaseFnContext;
    const { data, error } = await supabase.rpc("get_today_poll");
    if (error) throw new Error(error.message);
    return data as DailyPoll | null;
  });

export const voteDailyPollFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { vote: boolean }) => d)
  .handler(async ({ context, data }) => {
    const { supabase } = context as SupabaseFnContext;
    const { data: res, error } = await supabase.rpc("vote_daily_poll", { p_vote: data.vote });
    if (error) throw new Error(error.message);
    return res as { ok: boolean; xp?: number; reason?: string };
  });
