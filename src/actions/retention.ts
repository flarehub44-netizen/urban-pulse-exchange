import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware.server";
import { getSupabaseCtx } from "@/integrations/supabase/context";

export const dailyCheckInFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = getSupabaseCtx(context);
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
    const { supabase } = getSupabaseCtx(context);
    const { data, error } = await supabase.rpc("grant_email_link_bonus");
    if (error) throw new Error(error.message);
    return data as { already_claimed?: boolean; xp_delta?: number };
  });

export const useStreakFreezeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = getSupabaseCtx(context);
    const { data, error } = await supabase.rpc("use_streak_freeze");
    if (error) throw new Error(error.message);
    return data as { ok: boolean; freezes_left?: number; reason?: string };
  });

export const recordComebackFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = getSupabaseCtx(context);
    const { data, error } = await supabase.rpc("record_comeback_if_needed");
    if (error) throw new Error(error.message);
    return data as { comeback?: boolean; days_away?: number };
  });

export const buyStreakFreezeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = getSupabaseCtx(context);
    const { data, error } = await supabase.rpc("buy_streak_freeze");
    if (error) throw new Error(error.message);
    return data as {
      ok: boolean;
      freezes_left?: number;
      reason?: string;
      cost?: number;
      xp?: number;
    };
  });

export const getDailyMissionsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = getSupabaseCtx(context);
    const { data, error } = await supabase.rpc("get_daily_missions");
    if (error) throw new Error(error.message);
    return (Array.isArray(data) ? data : []) as DailyMission[];
  });

export const completeMissionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ mission_id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { supabase } = getSupabaseCtx(context);
    const { data: res, error } = await supabase.rpc("complete_mission", {
      p_mission_id: data.mission_id,
    });
    if (error) throw new Error(error.message);
    return res as { xp?: number; already_done?: boolean };
  });

export const getWeeklyReportFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = getSupabaseCtx(context);
    const { data, error } = await supabase.rpc("get_weekly_pulse_report");
    if (error) throw new Error(error.message);
    return data as WeeklyReport;
  });

export const getTraderArchetypeFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = getSupabaseCtx(context);
    const { data, error } = await supabase.rpc("get_trader_archetype");
    if (error) throw new Error(error.message);
    return data as TraderArchetype;
  });

export const recordMarketViewFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ market_id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { supabase } = getSupabaseCtx(context);
    const { error } = await supabase.rpc("record_market_view", { p_market_id: data.market_id });
    if (error) console.warn("[recordMarketView] failed silently:", error.message);
    return { ok: !error };
  });

export type AchievementUnlock = { id: string; name: string; description: string; icon?: string };

export type AchievementRow = AchievementUnlock & {
  unlocked: boolean;
  unlocked_at?: string;
  category?: string;
};

export type DailyMission = {
  id: string;
  label: string;
  description: string;
  xp_reward: number;
  icon: string;
  kind: string;
  completed: boolean;
  completed_at?: string;
};

export type WeeklyReport = {
  bets_week: number;
  wins_week: number;
  pnl_week: number;
  best_region: string | null;
  xp_week: number;
  streak: number;
  division: string;
  accuracy: number;
  rank_pct: number;
  report_week: string;
};

export type TraderArchetype = {
  archetype: string;
  archetype_en: string;
  description: string;
  icon: string;
  top_region: string | null;
  peak_hour: number | null;
  accuracy: number;
  total_bets: number;
};
