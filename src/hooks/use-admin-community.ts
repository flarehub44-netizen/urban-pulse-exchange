import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAdminCommunityMarketsFn,
  getAdminCommunityReportsFn,
  adminVoidCommunityMarketFn,
} from "@/actions/community-markets";

export type AdminCommunityMarketRow = {
  id: string;
  question: string;
  visibility: string;
  status: string;
  ends_at: string;
  created_at: string;
  volume: number;
  creator_username: string | null;
  created_by: string;
  pending_reports: number;
  bets_count?: number;
  access_token?: string | null;
};

export type AdminCommunityReportRow = {
  id: string;
  market_id: string;
  reason: string;
  created_at: string;
  question: string;
  visibility?: string;
  reporter_username: string;
};

export function useAdminCommunityMarkets() {
  return useQuery({
    queryKey: ["admin", "community-markets"],
    queryFn: async () => {
      const data = await getAdminCommunityMarketsFn();
      return (Array.isArray(data) ? data : []) as AdminCommunityMarketRow[];
    },
  });
}

export function useAdminCommunityReports() {
  return useQuery({
    queryKey: ["admin", "community-reports"],
    queryFn: async () => {
      const data = await getAdminCommunityReportsFn();
      return (Array.isArray(data) ? data : []) as AdminCommunityReportRow[];
    },
  });
}

export function useAdminVoidCommunityMarket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { marketId: string; reason?: string }) =>
      adminVoidCommunityMarketFn({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "community-markets"] });
      qc.invalidateQueries({ queryKey: ["admin", "community-reports"] });
      qc.invalidateQueries({ queryKey: ["markets"] });
    },
  });
}
