import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AchievementRow } from "@/actions/retention";

export function useAchievements(userId?: string | null) {
  return useQuery({
    queryKey: ["achievements", userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_user_achievements", {
        p_user_id: userId ?? undefined,
      });
      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];
      return rows as AchievementRow[];
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}
