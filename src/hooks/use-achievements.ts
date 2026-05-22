import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/supabase/loose";
import type { AchievementRow } from "@/actions/retention";

export function useAchievements(userId?: string | null) {
  return useQuery({
    queryKey: ["achievements", userId],
    queryFn: async () => {
      const { data, error } = await db.rpc("get_user_achievements", {
        p_user_id: userId,
      });
      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];
      return rows as AchievementRow[];
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}
