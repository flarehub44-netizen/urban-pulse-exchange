import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Division } from "@/store/viax-store";
import { getOwnProfileFn } from "@/actions/account";

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
  return useQuery<Profile, Error>({
    queryKey: ["me", userId],
    queryFn: async (): Promise<Profile> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const isOwn = !!user?.id && user.id === userId;

      if (isOwn) {
        return getOwnProfileFn() as Promise<Profile>;
      }

      const { data, error } = await supabase
        .from("leaderboard")
        .select("*")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Perfil não encontrado");
      return mapPublicProfile(data as unknown as Record<string, unknown>);
    },
    enabled: !!userId,
    staleTime: 15_000,
  });
}
