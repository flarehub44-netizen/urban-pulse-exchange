import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyLeaguesFn,
  createLeagueFn,
  joinLeagueFn,
  leaveLeagueFn,
  deleteLeagueFn,
  getLeagueLeaderboardFn,
} from "@/actions/leagues";

export function useMyLeagues() {
  return useQuery({
    queryKey: ["leagues"],
    queryFn: () => getMyLeaguesFn(),
    staleTime: 30_000,
  });
}

export function useLeagueLeaderboard(leagueId: string | null) {
  return useQuery({
    queryKey: ["league-leaderboard", leagueId],
    queryFn: () => getLeagueLeaderboardFn({ data: { league_id: leagueId! } }),
    enabled: !!leagueId,
    staleTime: 30_000,
  });
}

export function useCreateLeague() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; is_public?: boolean }) =>
      createLeagueFn({ data: input }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["leagues"] });
      await qc.refetchQueries({ queryKey: ["leagues"] });
    },
  });
}

export function useJoinLeague() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invite_code: string) => joinLeagueFn({ data: { invite_code } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leagues"] }),
  });
}

export function useLeaveLeague() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (league_id: string) => leaveLeagueFn({ data: { league_id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leagues"] }),
  });
}

export function useDeleteLeague() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (league_id: string) => deleteLeagueFn({ data: { league_id } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["leagues"] });
      await qc.refetchQueries({ queryKey: ["leagues"] });
    },
  });
}
