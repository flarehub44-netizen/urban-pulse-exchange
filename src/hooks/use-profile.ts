import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/integrations/supabase/loose";
import type { Division } from "@/store/viax-store";

export interface Profile {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  division: Division;
  balance: number;
  xp: number;
  xpToNext: number;
  streak: number;
  streakMultiplier: number;
  streakFreezesLeft: number;
  recoveryMode: boolean;
  recoveryDaysLeft: number;
  accuracy: number;
  roi: number;
  pnl: number;
  volume24h: number;
  city: string;
  neighborhood: string;
  isAdmin: boolean;
}

function mapProfile(row: Record<string, unknown>): Profile {
  return {
    id: row.id as string,
    name: row.name as string,
    handle: row.handle as string,
    avatar: row.avatar as string,
    division: row.division as Division,
    balance: Number(row.balance),
    xp: Number(row.xp),
    xpToNext: Number(row.xp_to_next),
    streak: Number(row.streak),
    streakMultiplier: Number(row.streak_multiplier ?? 1),
    streakFreezesLeft: Number(row.streak_freezes_left ?? 0),
    recoveryMode: Boolean(row.recovery_mode),
    recoveryDaysLeft: Number(row.recovery_days_left ?? 0),
    accuracy: Number(row.accuracy),
    roi: Number(row.roi),
    pnl: Number(row.pnl),
    volume24h: Number(row.volume_24h ?? row.volume ?? 0),
    city: row.city as string,
    neighborhood: row.neighborhood as string,
    isAdmin: Boolean(row.is_admin),
  };
}

function mapPublicProfile(row: Record<string, unknown>): Profile {
  return {
    id: row.id as string,
    name: row.name as string,
    handle: row.handle as string,
    avatar: row.avatar as string,
    division: row.division as Division,
    balance: 0,
    xp: 0,
    xpToNext: 2000,
    streak: Number(row.streak),
    streakMultiplier: 1,
    streakFreezesLeft: 0,
    recoveryMode: false,
    recoveryDaysLeft: 0,
    accuracy: Number(row.accuracy),
    roi: Number(row.roi),
    pnl: 0,
    volume24h: Number(row.volume ?? 0),
    city: row.city as string,
    neighborhood: row.neighborhood as string,
    isAdmin: false,
  };
}

export function useProfile(userId?: string | null) {
  return useQuery({
    queryKey: ["me", userId],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const isOwn = !!user?.id && user.id === userId;

      if (isOwn) {
        const { data, error } = (await db
          .from("profiles")
          .select("*")
          .eq("id", userId!)
          .single()) as { data: Record<string, unknown> | null; error: Error | null };
        if (error) throw error;
        return mapProfile(data as Record<string, unknown>);
      }

      const { data, error } = (await db
        .from("leaderboard")
        .select("*")
        .eq("id", userId!)
        .maybeSingle()) as { data: Record<string, unknown> | null; error: Error | null };
      if (error) throw error;
      if (!data) throw new Error("Perfil não encontrado");
      return mapPublicProfile(data);
    },
    enabled: !!userId,
    staleTime: 15_000,
  });
}
