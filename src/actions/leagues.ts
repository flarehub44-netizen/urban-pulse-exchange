import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseFnContext } from "@/integrations/supabase/loose";

export type League = {
  id: string;
  name: string;
  invite_code: string;
  is_creator: boolean;
  member_count: number;
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
    const { supabase } = context as unknown as SupabaseFnContext;
    const { data, error } = await supabase.rpc("get_my_leagues");
    if (error) throw new Error(error.message);
    return (Array.isArray(data) ? data : []) as League[];
  });

export const createLeagueFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string }) => d)
  .handler(async ({ context, data }) => {
    const { supabase } = context as unknown as SupabaseFnContext;
    const { data: res, error } = await supabase.rpc("create_league", { p_name: data.name });
    if (error) throw new Error(error.message);
    return res as { id: string; name: string; invite_code: string };
  });

export const joinLeagueFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { invite_code: string }) => d)
  .handler(async ({ context, data }) => {
    const { supabase } = context as unknown as SupabaseFnContext;
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
  .inputValidator((d: { league_id: string }) => d)
  .handler(async ({ context, data }) => {
    const { supabase } = context as unknown as SupabaseFnContext;
    const { data: res, error } = await supabase.rpc("leave_league", {
      p_league_id: data.league_id,
    });
    if (error) throw new Error(error.message);
    return res as { ok: boolean };
  });

export const getLeagueLeaderboardFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { league_id: string }) => d)
  .handler(async ({ context, data }) => {
    const { supabase } = context as unknown as SupabaseFnContext;
    const { data: res, error } = await supabase.rpc("get_league_leaderboard", {
      p_league_id: data.league_id,
    });
    if (error) throw new Error(error.message);
    return (Array.isArray(res) ? res : []) as LeagueMember[];
  });
