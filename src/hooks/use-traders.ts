import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Trader } from "@/store/viax-store";

function mapTrader(row: Record<string, unknown>): Trader {
  return {
    id: row.id as string,
    name: row.name as string,
    handle: row.handle as string,
    avatar: row.avatar as string,
    division: row.division as Trader["division"],
    accuracy: Number(row.accuracy),
    roi: Number(row.roi),
    streak: Number(row.streak),
    volume: Number(row.volume),
    weeklyGrowth: Number(row.weekly_growth ?? 0),
    city: row.city as string,
    neighborhood: row.neighborhood as string,
  };
}

export function useTraders() {
  return useQuery({
    queryKey: ["traders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leaderboard")
        .select("*")
        .limit(50);
      if (error) throw error;
      return (data ?? []).map(mapTrader);
    },
    staleTime: 60_000,
  });
}
