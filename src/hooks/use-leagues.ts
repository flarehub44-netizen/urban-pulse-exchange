import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyLeaguesFn,
  createLeagueFn,
  joinLeagueFn,
  leaveLeagueFn,
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
    mutationFn: (name: string) => createLeagueFn({ data: { name } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leagues"] }),
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
