import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyLeaguesFn,
  createLeagueFn,
  joinLeagueFn,
  joinLeagueByIdFn,
  leaveLeagueFn,
  deleteLeagueFn,
  getLeagueLeaderboardFn,
  getMyLeagueRankFn,
  listPublicLeaguesFn,
  getLeagueActivityFn,
  kickLeagueMemberFn,
  transferLeagueOwnershipFn,
  advanceLeagueSeasonFn,
  getLeagueSeasonHistoryFn,
  getLeagueWeeklyMissionsFn,
  claimLeagueWeeklyBonusFn,
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
    refetchInterval: leagueId ? 60_000 : false,
  });
}

export function useMyLeagueRank(leagueId: string | null) {
  return useQuery({
    queryKey: ["league-rank", leagueId],
    queryFn: () => getMyLeagueRankFn({ data: { league_id: leagueId! } }),
    enabled: !!leagueId,
    staleTime: 60_000,
  });
}

export function usePublicLeagues(q = "") {
  return useQuery({
    queryKey: ["public-leagues", q],
    queryFn: () => listPublicLeaguesFn({ data: { q: q || undefined } }),
    staleTime: 60_000,
  });
}

export function useLeagueActivity(leagueId: string | null) {
  return useQuery({
    queryKey: ["league-activity", leagueId],
    queryFn: () => getLeagueActivityFn({ data: { league_id: leagueId! } }),
    enabled: !!leagueId,
    staleTime: 30_000,
  });
}

export function useLeagueWeeklyMissions() {
  return useQuery({
    queryKey: ["league-weekly-missions"],
    queryFn: () => getLeagueWeeklyMissionsFn(),
    staleTime: 60_000,
  });
}

export function useClaimLeagueWeeklyBonus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (league_id: string) => claimLeagueWeeklyBonusFn({ data: { league_id } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["league-weekly-missions"] });
      await qc.invalidateQueries({ queryKey: ["achievements"] });
    },
  });
}

export function useLeagueSeasonHistory(leagueId: string | null) {
  return useQuery({
    queryKey: ["league-season-history", leagueId],
    queryFn: () => getLeagueSeasonHistoryFn({ data: { league_id: leagueId! } }),
    enabled: !!leagueId,
    staleTime: 120_000,
  });
}

function invalidateLeagueQueries(qc: ReturnType<typeof useQueryClient>, leagueId?: string) {
  void qc.invalidateQueries({ queryKey: ["leagues"] });
  if (leagueId) {
    void qc.invalidateQueries({ queryKey: ["league-leaderboard", leagueId] });
    void qc.invalidateQueries({ queryKey: ["league-rank", leagueId] });
    void qc.invalidateQueries({ queryKey: ["league-activity", leagueId] });
    void qc.invalidateQueries({ queryKey: ["league-season-history", leagueId] });
  }
  void qc.invalidateQueries({ queryKey: ["public-leagues"] });
}

export function useCreateLeague() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; is_public?: boolean }) => createLeagueFn({ data: input }),
    onSuccess: async () => {
      invalidateLeagueQueries(qc);
    },
  });
}

export function useJoinLeague() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invite_code: string) => joinLeagueFn({ data: { invite_code } }),
    onSuccess: () => invalidateLeagueQueries(qc),
  });
}

export function useJoinLeagueById() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (league_id: string) => joinLeagueByIdFn({ data: { league_id } }),
    onSuccess: () => invalidateLeagueQueries(qc),
  });
}

export function useLeaveLeague() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (league_id: string) => leaveLeagueFn({ data: { league_id } }),
    onSuccess: (_, leagueId) => invalidateLeagueQueries(qc, leagueId),
  });
}

export function useDeleteLeague() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (league_id: string) => deleteLeagueFn({ data: { league_id } }),
    onSuccess: async () => {
      invalidateLeagueQueries(qc);
    },
  });
}

export function useKickLeagueMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { league_id: string; user_id: string }) =>
      kickLeagueMemberFn({ data: input }),
    onSuccess: (_, vars) => invalidateLeagueQueries(qc, vars.league_id),
  });
}

export function useTransferLeagueOwnership() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { league_id: string; new_owner_id: string }) =>
      transferLeagueOwnershipFn({ data: input }),
    onSuccess: (_, vars) => invalidateLeagueQueries(qc, vars.league_id),
  });
}

export function useAdvanceLeagueSeason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (league_id: string) => advanceLeagueSeasonFn({ data: { league_id } }),
    onSuccess: (_, leagueId) => invalidateLeagueQueries(qc, leagueId),
  });
}
