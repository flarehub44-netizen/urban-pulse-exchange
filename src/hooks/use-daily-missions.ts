import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getDailyMissionsFn, completeMissionFn } from "@/actions/retention";
import { useAnonAuth } from "@/hooks/use-anon-auth";

export function useDailyMissions() {
  const { userId } = useAnonAuth();
  return useQuery({
    queryKey: ["daily-missions", userId],
    queryFn: () => getDailyMissionsFn(),
    enabled: !!userId,
    staleTime: 60_000,
  });
}

export function useCompleteMission() {
  const queryClient = useQueryClient();
  const { userId } = useAnonAuth();
  return useMutation({
    mutationFn: (mission_id: string) => completeMissionFn({ data: { mission_id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-missions", userId] });
      queryClient.invalidateQueries({ queryKey: ["me", userId] });
    },
  });
}
