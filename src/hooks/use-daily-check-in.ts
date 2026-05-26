import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dailyCheckInFn } from "@/actions/retention";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export function useTodayCheckIn(userId?: string | null) {
  return useQuery({
    queryKey: ["daily-check-in", userId],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("daily_check_ins")
        .select("check_in_date, xp_awarded, insight")
        .eq("user_id", userId!)
        .eq("check_in_date", today)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useDailyCheckIn() {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    mutationFn: () => dailyCheckInFn(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-check-in", userId] });
      queryClient.invalidateQueries({ queryKey: ["me", userId] });
    },
  });
}
