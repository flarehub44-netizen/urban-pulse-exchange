import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware.server";
import { requireAdminAuth } from "@/integrations/supabase/admin-middleware";
import { getSupabaseCtx } from "@/integrations/supabase/context";
import { mapSupabaseBusinessError } from "@/lib/server-errors";

export type ImpactLeaderboardEntry = {
  user_id: string;
  name: string;
  handle: string;
  avatar: string | null;
  division: string;
  impact_xp: number;
  events_count: number;
  rank: number;
};

export type ImpactWinnerEntry = {
  rank: number;
  user_id: string;
  name: string;
  handle: string;
  avatar: string | null;
  xp_total: number;
  prize_label: string;
  fulfilled_at: string | null;
};

export type MonthlyImpactLeaderboard = {
  period_month: string;
  period_label: string;
  days_left: number;
  my_xp: number;
  my_rank: number | null;
  leaderboard: ImpactLeaderboardEntry[];
  winners: ImpactWinnerEntry[];
};

export type EventImpactSummary = {
  period_month: string;
  my_xp: number;
  my_rank: number | null;
  days_left: number;
  recent_events: {
    market_id: string;
    xp_awarded: number;
    volume_valid: number;
    unique_bettors: number;
    status: string;
    credited_at: string;
  }[];
};

export type AdminImpactWinnerRow = {
  id: string;
  period_month: string;
  rank: number;
  user_id: string;
  name: string;
  handle: string;
  xp_total: number;
  prize_label: string;
  fulfilled_at: string | null;
  fulfilled_by: string | null;
  notes: string | null;
};

export const getMonthlyImpactLeaderboardFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ month: z.string().optional(), limit: z.number().int().min(1).max(100).optional() }).optional())
  .handler(async ({ data, context }) => {
    const { supabase } = getSupabaseCtx(context);
    const { data: res, error } = await supabase.rpc("get_monthly_impact_leaderboard", {
      p_month: data?.month ?? undefined,
      p_limit: data?.limit ?? 50,
    });
    if (error) throw mapSupabaseBusinessError(error.message);
    return res as MonthlyImpactLeaderboard;
  });

export const getMyEventImpactSummaryFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = getSupabaseCtx(context);
    const { data, error } = await supabase.rpc("get_my_event_impact_summary");
    if (error) throw mapSupabaseBusinessError(error.message);
    return data as EventImpactSummary;
  });

export const adminListMonthlyImpactWinnersFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .inputValidator(z.object({ month: z.string().optional() }).optional())
  .handler(async ({ data, context }) => {
    const { supabase } = getSupabaseCtx(context);
    const { data: res, error } = await supabase.rpc("admin_list_monthly_impact_winners", {
      p_month: data?.month ?? undefined,
    });
    if (error) throw mapSupabaseBusinessError(error.message);
    return (Array.isArray(res) ? res : []) as AdminImpactWinnerRow[];
  });

export const adminMarkImpactPrizeFulfilledFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator(z.object({ winner_id: z.string().uuid(), notes: z.string().max(500).optional() }))
  .handler(async ({ data, context }) => {
    const { supabase } = getSupabaseCtx(context);
    const { data: res, error } = await supabase.rpc("admin_mark_impact_prize_fulfilled", {
      p_winner_id: data.winner_id,
      p_notes: data.notes ?? undefined,
    });
    if (error) throw mapSupabaseBusinessError(error.message);
    return res as { ok: boolean };
  });
