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
};

export type LeagueMember = {
  user_id: string;
  name: string;
  handle: string;
  avatar: string;
  xp: number;
  division: string;
  accuracy: number;
  is_me: boolean;
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
    z.object({ name: z.string().min(2).max(40), is_public: z.boolean().optional() }),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = getSupabaseCtx(context);
    const { data: res, error } = await supabase.rpc("create_league", {
      p_name: data.name,
      p_is_public: data.is_public ?? false,
    });
    if (error) throw new Error(error.message);
    return res as { id: string; name: string; invite_code: string; is_public: boolean };
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

export const leaveLeagueFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ league_id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { supabase } = getSupabaseCtx(context);
    const { data: res, error } = await supabase.rpc("leave_league", {
      p_league_id: data.league_id,
    });
    if (error) throw new Error(error.message);
    return res as { ok: boolean };
  });

export const deleteLeagueFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ league_id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { supabase } = getSupabaseCtx(context);
    const { data: res, error } = await (supabase.rpc as unknown as (
      fn: string,
      params: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>)(
      "delete_league",
      { p_league_id: data.league_id },
    );
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
