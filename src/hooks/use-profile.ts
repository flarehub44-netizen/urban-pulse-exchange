import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  accuracy: number;
  roi: number;
  pnl: number;
  volume24h: number;
  city: string;
  neighborhood: string;
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
    accuracy: Number(row.accuracy),
    roi: Number(row.roi),
    pnl: Number(row.pnl),
    volume24h: Number(row.volume_24h),
    city: row.city as string,
    neighborhood: row.neighborhood as string,
  };
}

export function useProfile(userId?: string | null) {
  return useQuery({
    queryKey: ["me", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId!)
        .single();
      if (error) throw error;
      return mapProfile(data as Record<string, unknown>);
    },
    enabled: !!userId,
    staleTime: 15_000,
  });
}
