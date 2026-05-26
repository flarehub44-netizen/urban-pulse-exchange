import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type UrbanMindDigest = {
  headline: string;
  body: string;
  wins_vs_ai: number;
  bets_vs_ai: number;
  last_market_id?: string;
  last_side?: "YES" | "NO";
};

export function useUrbanMindDigest() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["urbanmind-digest", userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_urbanmind_digest");
      if (error) throw error;
      return data as UrbanMindDigest;
    },
    enabled: !!userId,
    staleTime: 120_000,
  });
}
