import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminFootballResolveFn, adminFootballSyncFn } from "@/actions/football-admin";
import { useAdminUpdateSetting } from "@/hooks/use-admin-dashboard";
import { supabase } from "@/integrations/supabase/client";

export type FootballPendingRow = {
  api_fixture_id: number;
  kickoff_at: string;
  status_short: string;
  home_team_name: string;
  away_team_name: string;
  league_id: number;
  league_name: string;
  review_status: string;
  market_id: string | null;
  market_status: string | null;
};

export type FootballDraftRow = {
  market_id: string;
  question: string;
  status: string;
  kickoff_at: string;
  home_team_name: string;
  away_team_name: string;
  pool_home: number;
  pool_draw: number;
  pool_away: number;
};

export type FootballLiveRow = {
  market_id: string;
  question: string;
  status: string;
  pool_home: number;
  pool_draw: number;
  pool_away: number;
  participants: number;
  winning_outcome: string | null;
  kickoff_at: string;
  home_team_name: string;
  away_team_name: string;
  status_short: string;
};

export function useAdminFootballPending() {
  return useQuery({
    queryKey: ["admin-football-pending"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_football_pending", { p_limit: 100 });
      if (error) throw error;
      return (data ?? []) as FootballPendingRow[];
    },
    refetchInterval: 30_000,
  });
}

export function useAdminFootballDrafts() {
  return useQuery({
    queryKey: ["admin-football-drafts"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_football_drafts", { p_limit: 100 });
      if (error) throw error;
      return (data ?? []) as FootballDraftRow[];
    },
    refetchInterval: 15_000,
  });
}

export function useAdminFootballLive() {
  return useQuery({
    queryKey: ["admin-football-live"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_football_live", { p_limit: 100 });
      if (error) throw error;
      return (data ?? []) as FootballLiveRow[];
    },
    refetchInterval: 15_000,
  });
}

export function useAdminApproveFootballFixture() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (fixtureId: number) => {
      const { data, error } = await supabase.rpc("admin_approve_football_fixture", {
        p_fixture_id: fixtureId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-football-pending"] });
      qc.invalidateQueries({ queryKey: ["admin-football-drafts"] });
    },
  });
}

export function useAdminRejectFootballFixture() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ fixtureId, reason }: { fixtureId: number; reason?: string }) => {
      const { data, error } = await supabase.rpc("admin_reject_football_fixture", {
        p_fixture_id: fixtureId,
        p_reason: reason ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-football-pending"] });
    },
  });
}

export function useAdminPublishFootballMarket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (marketId: string) => {
      const { data, error } = await supabase.rpc("admin_publish_football_market", {
        p_market_id: marketId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-football-drafts"] });
      qc.invalidateQueries({ queryKey: ["admin-football-live"] });
      qc.invalidateQueries({ queryKey: ["football-markets"] });
    },
  });
}

export function useAdminVoidFootballMarket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ marketId, reason }: { marketId: string; reason?: string }) => {
      const { data, error } = await supabase.rpc("admin_void_football_market", {
        p_market_id: marketId,
        p_reason: reason ?? "admin_void",
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-football-drafts"] });
      qc.invalidateQueries({ queryKey: ["admin-football-live"] });
      qc.invalidateQueries({ queryKey: ["football-markets"] });
      qc.invalidateQueries({ queryKey: ["football-bets"] });
    },
  });
}

export function useFootballLeagueSettings() {
  return useQuery({
    queryKey: ["football-league-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("key, value")
        .in("key", [
          "football_enabled",
          "football_league_ids",
          "football_sync_days_ahead",
          "football_betting_close_minutes",
        ]);
      if (error) throw error;
      const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
      return {
        enabled: Boolean(map.football_enabled ?? true),
        leagueIds: (map.football_league_ids as number[] | undefined) ?? [71],
        syncDaysAhead: Number(map.football_sync_days_ahead ?? 7),
        bettingCloseMinutes: Number(map.football_betting_close_minutes ?? 5),
      };
    },
  });
}

export function useAdminFootballSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => adminFootballSyncFn(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-football-pending"] });
      qc.invalidateQueries({ queryKey: ["football-league-settings"] });
    },
  });
}

export function useAdminFootballResolve() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => adminFootballResolveFn(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["football-markets"] });
      qc.invalidateQueries({ queryKey: ["admin-football-drafts"] });
      qc.invalidateQueries({ queryKey: ["admin-football-live"] });
    },
  });
}

export function useUpdateFootballSettings() {
  const update = useAdminUpdateSetting();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      enabled: boolean;
      leagueIds: number[];
      syncDaysAhead: number;
      bettingCloseMinutes: number;
    }) => {
      await update.mutateAsync({ key: "football_enabled", value: input.enabled });
      await update.mutateAsync({ key: "football_league_ids", value: input.leagueIds });
      await update.mutateAsync({ key: "football_sync_days_ahead", value: input.syncDaysAhead });
      await update.mutateAsync({
        key: "football_betting_close_minutes",
        value: input.bettingCloseMinutes,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["football-league-settings"] });
      qc.invalidateQueries({ queryKey: ["football-enabled"] });
    },
  });
}
