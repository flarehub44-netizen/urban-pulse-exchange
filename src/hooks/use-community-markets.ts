import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCommunityMarketFn,
  getCommunityMarketFn,
  joinCommunityMarketFn,
  listMyCommunityMarketsFn,
  listPublicCommunityMarketsFn,
  reportCommunityMarketFn,
  resolveCommunityMarketFn,
  voidCommunityMarketFn,
} from "@/actions/community-markets";
import {
  mapCommunityMarketRow,
  type CommunityMarketRow,
} from "@/lib/community-market";
import type { Market } from "@/store/viax-store";
import { useAuth } from "@/hooks/use-auth";

function mapRows(rows: Record<string, unknown>[]): Market[] {
  return rows.map((r) => mapCommunityMarketRow(r as unknown as CommunityMarketRow));
}

export function usePublicCommunityMarkets() {
  return useQuery({
    queryKey: ["markets", "community", "public"],
    queryFn: async () => {
      const rows = await listPublicCommunityMarketsFn();
      return mapRows(rows);
    },
    staleTime: 30_000,
  });
}

export function useMyCommunityMarkets(enabled = true) {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["markets", "community", "mine", userId],
    queryFn: async () => {
      const rows = await listMyCommunityMarketsFn({ data: undefined });
      return mapRows(rows);
    },
    enabled: enabled && !!userId,
    staleTime: 20_000,
  });
}

export function useCommunityMarketDetail(marketId: string, accessToken?: string, skip = false) {
  const { userId, authReady } = useAuth();
  return useQuery({
    queryKey: ["markets", "community", marketId, accessToken ?? "", userId],
    queryFn: async () => {
      const res = await getCommunityMarketFn({
        data: { marketId, accessToken },
      });
      if (!res.ok || !res.market) {
        return { market: null as Market | null, isCreator: false, reason: res.reason };
      }
      return {
        market: mapCommunityMarketRow(res.market as unknown as CommunityMarketRow),
        isCreator: Boolean(res.is_creator),
        reason: undefined as string | undefined,
      };
    },
    enabled: !skip && authReady && !!userId && marketId.startsWith("cm-"),
    retry: false,
  });
}

export function useCreateCommunityMarket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      question: string;
      endsAt: Date;
      visibility: "public" | "unlisted";
    }) =>
      createCommunityMarketFn({
        data: {
          question: input.question,
          endsAt: input.endsAt.toISOString(),
          visibility: input.visibility,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["markets"] });
    },
  });
}

export function useJoinCommunityMarket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (accessToken: string) => joinCommunityMarketFn({ data: { accessToken } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["markets"] });
    },
  });
}

export function useResolveCommunityMarket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { marketId: string; winningSide: "YES" | "NO" }) =>
      resolveCommunityMarketFn({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["markets"] });
    },
  });
}

export function useVoidCommunityMarket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { marketId: string; reason?: string }) =>
      voidCommunityMarketFn({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["markets"] });
    },
  });
}

export function useReportCommunityMarket() {
  return useMutation({
    mutationFn: (input: { marketId: string; reason: string }) =>
      reportCommunityMarketFn({ data: input }),
  });
}
