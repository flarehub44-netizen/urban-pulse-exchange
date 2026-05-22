import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTodayPollFn, voteDailyPollFn } from "@/actions/polls";

export function useTodayPoll() {
  return useQuery({
    queryKey: ["daily-poll"],
    queryFn: () => getTodayPollFn(),
    staleTime: 60_000,
  });
}

export function useVotePoll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vote: boolean) => voteDailyPollFn({ data: { vote } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daily-poll"] });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}
