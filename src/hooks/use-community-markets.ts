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
import { mapCommunityMarketRow, type CommunityMarketRow } from "@/lib/community-market";
import type { Market } from "@/store/viax-store";
import { useAuth } from "@/hooks/use-auth";

function mapRows(rows: Record<string, unknown>[]): Market[] {
  return rows.map((r) => mapCommunityMarketRow(r as unknown as CommunityMarketRow));
}

export type CommunityMarketDetailResult = {
  market: Market | null;
  isCreator: boolean;
  reason?: string;
};

export function communityMarketDetailQueryKey(
  marketId: string,
  accessToken?: string,
  userId?: string | null,
) {
  return ["markets", "community", marketId, accessToken ?? "", userId ?? ""] as const;
}

export async function fetchCommunityMarketDetail(
  marketId: string,
  accessToken?: string,
): Promise<CommunityMarketDetailResult> {
  const res = await getCommunityMarketFn({
    data: { marketId, accessToken },
  });
  if (!res.ok || !res.market) {
    return { market: null, isCreator: false, reason: res.reason };
  }
  return {
    market: mapCommunityMarketRow(res.market as unknown as CommunityMarketRow),
    isCreator: Boolean(res.is_creator),
    reason: undefined,
  };
}

/** True while community detail must not 404 yet (auth or fetch pending). */
export function shouldDeferCommunityNotFound(opts: {
  authReady: boolean;
  userId: string | null | undefined;
  communityFetched: boolean;
  hasMarket: boolean;
}): boolean {
  if (opts.hasMarket) return false;
  if (!opts.authReady) return true;
  if (!opts.userId) return true;
  return !opts.communityFetched;
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

export function useCommunityMarketDetail(marketId: string, accessToken?: string) {
  const { userId, authReady } = useAuth();
  return useQuery({
    queryKey: communityMarketDetailQueryKey(marketId, accessToken, userId),
    queryFn: () => fetchCommunityMarketDetail(marketId, accessToken),
    enabled: authReady && !!userId && marketId.startsWith("cm-"),
    retry: false,
  });
}

export function useCreateCommunityMarket() {
  const qc = useQueryClient();
  const { userId } = useAuth();
  return useMutation({
    mutationFn: (input: {
      question: string;
      endsAt: Date;
      visibility: "public" | "unlisted";
      coverUrl?: string;
    }) =>
      createCommunityMarketFn({
        data: {
          question: input.question,
          endsAt: input.endsAt.toISOString(),
          visibility: input.visibility,
          coverUrl: input.coverUrl,
        },
      }),
    onSuccess: (result) => {
      const marketId = result.market_id;
      if (userId && marketId?.startsWith("cm-")) {
        void qc.prefetchQuery({
          queryKey: communityMarketDetailQueryKey(marketId, undefined, userId),
          queryFn: () => fetchCommunityMarketDetail(marketId),
        });
      }
      void qc.invalidateQueries({ queryKey: ["markets"] });
      void qc.invalidateQueries({ queryKey: ["markets", "community"] });
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
