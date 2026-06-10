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
};

export type LeagueActivityItem = {
  kind: "bet" | "join";
  at: string;
  user_name: string;
  market_id: string | null;
  stake: number | null;
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
  .inputValidator(z.object({ name: z.string().min(2).max(40), is_public: z.boolean().optional() }))
  .handler(async ({ context, data }) => {
    const { supabase } = getSupabaseCtx(context);
    const { data: res, error } = await supabase.rpc("create_league", {
      p_name: data.name,
      p_is_public: data.is_public ?? false,
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
    z.object({ q: z.string().optional(), limit: z.number().int().min(1).max(48).optional() }),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = getSupabaseCtx(context);
    const { data: res, error } = await supabase.rpc("list_public_leagues", {
      p_q: data.q ?? null,
      p_limit: data.limit ?? 24,
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
