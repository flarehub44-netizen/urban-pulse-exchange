import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminApproveFootballFixtureFn,
  adminDeleteFootballMarketFn,
  adminListFootballDraftsFn,
  adminListFootballLiveFn,
  adminListFootballPendingFn,
  adminPublishFootballMarketFn,
  adminRejectFootballFixtureFn,
  adminVoidFootballMarketFn,
} from "@/actions/admin/football";
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

export function useAdminFootballPending(date?: string) {
  return useQuery({
    queryKey: ["admin-football-pending", date ?? "all"],
    queryFn: () =>
      adminListFootballPendingFn({ data: { date, limit: 100 } }) as Promise<FootballPendingRow[]>,
    refetchInterval: 30_000,
  });
}

export function useAdminFootballDrafts() {
  return useQuery({
    queryKey: ["admin-football-drafts"],
    queryFn: () =>
      adminListFootballDraftsFn({ data: { limit: 100 } }) as Promise<FootballDraftRow[]>,
    refetchInterval: 15_000,
  });
}

export function useAdminFootballLive() {
  return useQuery({
    queryKey: ["admin-football-live"],
    queryFn: () => adminListFootballLiveFn({ data: { limit: 100 } }) as Promise<FootballLiveRow[]>,
    refetchInterval: 15_000,
  });
}

export function useAdminApproveFootballFixture() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fixtureId: number) => adminApproveFootballFixtureFn({ data: { fixtureId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-football-pending"] });
      qc.invalidateQueries({ queryKey: ["admin-football-drafts"] });
    },
  });
}

export function useAdminRejectFootballFixture() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fixtureId, reason }: { fixtureId: number; reason?: string }) =>
      adminRejectFootballFixtureFn({ data: { fixtureId, reason } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-football-pending"] });
    },
  });
}

export function useAdminPublishFootballMarket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (marketId: string) => adminPublishFootballMarketFn({ data: { marketId } }),
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
    mutationFn: ({ marketId, reason }: { marketId: string; reason?: string }) =>
      adminVoidFootballMarketFn({ data: { marketId, reason } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-football-drafts"] });
      qc.invalidateQueries({ queryKey: ["admin-football-live"] });
      qc.invalidateQueries({ queryKey: ["football-markets"] });
      qc.invalidateQueries({ queryKey: ["football-bets"] });
    },
  });
}

export function useAdminDeleteFootballMarket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (marketId: string) => adminDeleteFootballMarketFn({ data: { marketId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-football-drafts"] });
      qc.invalidateQueries({ queryKey: ["admin-football-live"] });
      qc.invalidateQueries({ queryKey: ["admin-football-pending"] });
      qc.invalidateQueries({ queryKey: ["football-markets"] });
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
        .in("key", ["football_enabled"]);
      if (error) throw error;
      const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
      return {
        enabled: Boolean(map.football_enabled ?? true),
      };
    },
  });
}

export function useAdminFootballSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (date?: string) => adminFootballSyncFn({ data: date ? { date } : undefined }),
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
    mutationFn: async (input: { enabled: boolean }) => {
      await update.mutateAsync({ key: "football_enabled", value: input.enabled });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["football-league-settings"] });
      qc.invalidateQueries({ queryKey: ["football-enabled"] });
    },
  });
}
