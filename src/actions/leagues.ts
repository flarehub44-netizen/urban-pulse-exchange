import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getSupabaseCtx } from "@/integrations/supabase/context";

export type League = {
  id: string;
  name: string;
  invite_code: string;
  is_creator: boolean;
  member_count: number;
  is_public: boolean;
  season_label?: string;
  season_ends_at?: string;
  allowed_verticals?: string[] | null;
};

export type LeaguePreviewEntry = {
  rank: number;
  score: number;
  label: string;
};

export type LeagueHeadToHeadSide = {
  user_id: string;
  name: string;
  rank: number;
  score: number;
  roi: number;
  volume: number;
  accuracy: number;
};

export type LeagueHeadToHead = {
  ok: boolean;
  reason?: string;
  me?: LeagueHeadToHeadSide;
  opponent?: LeagueHeadToHeadSide;
  score_gap?: number;
  rank_gap?: number;
};

export type LeagueMember = {
  user_id: string;
  name: string;
  handle: string;
  avatar: string;
  division: string;
  is_me: boolean;
  rank: number;
  score: number;
  roi: number;
  volume: number;
  accuracy: number;
  settled_count: number;
  delta_rank: number;
};

export type LeagueRankSummary = {
  ok: boolean;
  rank?: number;
  score?: number;
  member_count?: number;
  roi?: number;
  volume?: number;
  accuracy?: number;
  season_label?: string;
  reason?: string;
};

export type PublicLeague = {
  id: string;
  name: string;
  member_count: number;
  season_label: string;
  is_member: boolean;
  top_score: number;
  allowed_verticals?: string[] | null;
  top_preview?: LeaguePreviewEntry[];
};

export type LeagueActivityItem = {
  kind: "bet" | "join";
  at: string;
  user_name: string;
  market_id: string | null;
  stake: number | null;
};

export type LeagueSeasonHistoryItem = {
  season_label: string;
  starts_at: string;
  ends_at: string;
  winner_user_id: string | null;
  winner_name: string;
  top_scores: Array<{ user_id: string; rank: number; score: number }>;
};

export type LeagueWeeklyMission = {
  league_id: string;
  league_name: string;
  settled_count: number;
  eligible: boolean;
  claimed: boolean;
  xp_reward: number;
  season_label: string;
};

export const getMyLeaguesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = getSupabaseCtx(context);
    const { data, error } = await supabase.rpc("get_my_leagues");
    if (error) throw new Error(error.message);
    return (Array.isArray(data) ? data : []) as League[];
  });

export const createLeagueFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      name: z.string().min(2).max(40),
      is_public: z.boolean().optional(),
      allowed_verticals: z.array(z.string()).optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = getSupabaseCtx(context);
    const { data: res, error } = await supabase.rpc("create_league", {
      p_name: data.name,
      p_is_public: data.is_public ?? false,
      p_allowed_verticals:
        data.allowed_verticals && data.allowed_verticals.length > 0
          ? data.allowed_verticals
          : null,
    });
    if (error) throw new Error(error.message);
    return res as {
      id: string;
      name: string;
      invite_code: string;
      is_public: boolean;
      season_label?: string;
    };
  });

export const joinLeagueFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ invite_code: z.string().min(4).max(20) }))
  .handler(async ({ context, data }) => {
    const { supabase } = getSupabaseCtx(context);
    const { data: res, error } = await supabase.rpc("join_league", {
      p_invite_code: data.invite_code,
    });
    if (error) throw new Error(error.message);
    return res as {
      ok: boolean;
      league_id?: string;
      name?: string;
      already_member?: boolean;
      reason?: string;
    };
  });

export const joinLeagueByIdFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ league_id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { supabase } = getSupabaseCtx(context);
    const { data: res, error } = await supabase.rpc("join_league_by_id", {
      p_league_id: data.league_id,
    });
    if (error) throw new Error(error.message);
    return res as {
      ok: boolean;
      league_id?: string;
      name?: string;
      already_member?: boolean;
      reason?: string;
    };
  });

export const leaveLeagueFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ league_id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { supabase } = getSupabaseCtx(context);
    const { data: res, error } = await supabase.rpc("leave_league", {
      p_league_id: data.league_id,
    });
    if (error) throw new Error(error.message);
    return res as { ok: boolean; reason?: string };
  });

export const deleteLeagueFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ league_id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { supabase } = getSupabaseCtx(context);
    const { data: res, error } = await supabase.rpc("delete_league", {
      p_league_id: data.league_id,
    });
    if (error) throw new Error(error.message);
    return res as { ok: boolean; reason?: string };
  });

export const getLeagueLeaderboardFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ league_id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { supabase } = getSupabaseCtx(context);
    const { data: res, error } = await supabase.rpc("get_league_leaderboard", {
      p_league_id: data.league_id,
    });
    if (error) throw new Error(error.message);
    return (Array.isArray(res) ? res : []) as LeagueMember[];
  });

export const getMyLeagueRankFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ league_id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { supabase } = getSupabaseCtx(context);
    const { data: res, error } = await supabase.rpc("get_my_league_rank", {
      p_league_id: data.league_id,
    });
    if (error) throw new Error(error.message);
    return res as LeagueRankSummary;
  });

export const listPublicLeaguesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      q: z.string().optional(),
      limit: z.number().int().min(1).max(48).optional(),
      vertical: z.string().optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = getSupabaseCtx(context);
    const { data: res, error } = await supabase.rpc("list_public_leagues", {
      p_q: data.q ?? null,
      p_limit: data.limit ?? 24,
      p_vertical: data.vertical ?? null,
    });
    if (error) throw new Error(error.message);
    return (Array.isArray(res) ? res : []) as PublicLeague[];
  });

export const getLeagueActivityFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({ league_id: z.string().uuid(), limit: z.number().int().min(1).max(50).optional() }),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = getSupabaseCtx(context);
    const { data: res, error } = await supabase.rpc("get_league_activity", {
      p_league_id: data.league_id,
      p_limit: data.limit ?? 20,
    });
    if (error) throw new Error(error.message);
    return (Array.isArray(res) ? res : []) as LeagueActivityItem[];
  });

export const kickLeagueMemberFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ league_id: z.string().uuid(), user_id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { supabase } = getSupabaseCtx(context);
    const { data: res, error } = await supabase.rpc("kick_league_member", {
      p_league_id: data.league_id,
      p_user_id: data.user_id,
    });
    if (error) throw new Error(error.message);
    return res as { ok: boolean; reason?: string };
  });

export const transferLeagueOwnershipFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ league_id: z.string().uuid(), new_owner_id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { supabase } = getSupabaseCtx(context);
    const { data: res, error } = await supabase.rpc("transfer_league_ownership", {
      p_league_id: data.league_id,
      p_new_owner_id: data.new_owner_id,
    });
    if (error) throw new Error(error.message);
    return res as { ok: boolean; reason?: string };
  });

export const getLeagueSeasonHistoryFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({ league_id: z.string().uuid(), limit: z.number().int().min(1).max(24).optional() }),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = getSupabaseCtx(context);
    const { data: res, error } = await supabase.rpc("get_league_season_history", {
      p_league_id: data.league_id,
      p_limit: data.limit ?? 12,
    });
    if (error) throw new Error(error.message);
    return (Array.isArray(res) ? res : []) as LeagueSeasonHistoryItem[];
  });

export const getLeagueWeeklyMissionsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = getSupabaseCtx(context);
    const { data, error } = await supabase.rpc("get_league_weekly_missions");
    if (error) throw new Error(error.message);
    return (Array.isArray(data) ? data : []) as LeagueWeeklyMission[];
  });

export const claimLeagueWeeklyBonusFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ league_id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { supabase } = getSupabaseCtx(context);
    const { data: res, error } = await supabase.rpc("claim_league_weekly_bonus", {
      p_league_id: data.league_id,
    });
    if (error) throw new Error(error.message);
    return res as { ok?: boolean; reason?: string; xp_awarded?: number };
  });

export const getLeagueHeadToHeadFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({ league_id: z.string().uuid(), opponent_user_id: z.string().uuid() }),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = getSupabaseCtx(context);
    const { data: res, error } = await supabase.rpc("get_league_head_to_head", {
      p_league_id: data.league_id,
      p_opponent_user_id: data.opponent_user_id,
    });
    if (error) throw new Error(error.message);
    return res as LeagueHeadToHead;
  });

export const getLeagueSuggestedRivalFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ league_id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { supabase } = getSupabaseCtx(context);
    const { data: res, error } = await supabase.rpc("get_league_suggested_rival", {
      p_league_id: data.league_id,
    });
    if (error) throw new Error(error.message);
    return res as LeagueHeadToHead;
  });

export const advanceLeagueSeasonFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ league_id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { supabase } = getSupabaseCtx(context);
    const { data: res, error } = await supabase.rpc("advance_league_season", {
      p_league_id: data.league_id,
    });
    if (error) throw new Error(error.message);
    return res as { ok: boolean; season_label?: string; winner_user_id?: string; reason?: string };
  });
