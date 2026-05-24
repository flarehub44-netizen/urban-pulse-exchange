import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/supabase/loose";

export function useFootballEnabled() {
  return useQuery({
    queryKey: ["football-enabled"],
    queryFn: async () => {
      const { data, error } = await db.rpc("is_football_enabled");
      if (error) throw error;
      return Boolean(data);
    },
    staleTime: 60_000,
  });
}
