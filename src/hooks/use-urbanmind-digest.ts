import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/supabase/loose";
import { useAnonAuth } from "@/hooks/use-anon-auth";

export type UrbanMindDigest = {
  headline: string;
  body: string;
  wins_vs_ai: number;
  bets_vs_ai: number;
  last_market_id?: string;
  last_side?: "YES" | "NO";
};

export function useUrbanMindDigest() {
  const { userId } = useAnonAuth();
  return useQuery({
    queryKey: ["urbanmind-digest", userId],
    queryFn: async () => {
      const { data, error } = await db.rpc("get_urbanmind_digest");
      if (error) throw error;
      return data as UrbanMindDigest;
    },
    enabled: !!userId,
    staleTime: 120_000,
  });
}
