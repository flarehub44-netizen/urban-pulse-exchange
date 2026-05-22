import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseFnContext } from "@/integrations/supabase/loose";

export const dailyCheckInFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context as SupabaseFnContext;
    const { data, error } = await supabase.rpc("daily_check_in");
    if (error) throw new Error(error.message);
    return data as {
      already_checked_in?: boolean;
      streak?: number;
      xp_awarded?: number;
      insight?: string;
      progress?: { achievements_unlocked?: AchievementUnlock[] };
    };
  });

export const grantEmailLinkBonusFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context as SupabaseFnContext;
    const { data, error } = await supabase.rpc("grant_email_link_bonus");
    if (error) throw new Error(error.message);
    return data as { already_claimed?: boolean; xp_delta?: number };
  });

export const useStreakFreezeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context as SupabaseFnContext;
    const { data, error } = await supabase.rpc("use_streak_freeze");
    if (error) throw new Error(error.message);
    return data as { ok: boolean; freezes_left?: number; reason?: string };
  });

export const recordComebackFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context as SupabaseFnContext;
    const { data, error } = await supabase.rpc("record_comeback_if_needed");
    if (error) throw new Error(error.message);
    return data as { comeback?: boolean; days_away?: number };
  });

export type AchievementUnlock = { id: string; name: string; description: string };

export type AchievementRow = AchievementUnlock & {
  unlocked: boolean;
  unlocked_at?: string;
};
