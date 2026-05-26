import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCommunityMarketFn,
  getCommunityMarketFn,
  getCommunityMarketPublicFn,
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

export const PUBLIC_COMMUNITY_MARKETS_QUERY_KEY = ["markets", "community", "public"] as const;

export function communityMarketDetailQueryKey(
  marketId: string,
  accessToken?: string,
  userId?: string | null,
) {
  return ["markets", "community", marketId, accessToken ?? "", userId ?? "anon"] as const;
}

type RpcCommunityMarketResult = {
  ok?: boolean;
  market?: Record<string, unknown>;
  is_creator?: boolean;
  reason?: string;
};

function mapRpcCommunityMarketDetail(res: RpcCommunityMarketResult): CommunityMarketDetailResult {
  if (!res.ok || !res.market) {
    return { market: null, isCreator: false, reason: res.reason };
  }
  return {
    market: mapCommunityMarketRow(res.market as unknown as CommunityMarketRow),
    isCreator: Boolean(res.is_creator),
    reason: undefined,
  };
}

export async function fetchCommunityMarketDetail(
  marketId: string,
  accessToken?: string,
  options?: { authenticated?: boolean },
): Promise<CommunityMarketDetailResult> {
  const res =
    options?.authenticated === true
      ? await getCommunityMarketFn({ data: { marketId, accessToken } })
      : await getCommunityMarketPublicFn({ data: { marketId, accessToken } });
  return mapRpcCommunityMarketDetail(res);
}

/** True while community detail must not 404 yet (auth or fetch pending). */
export function shouldDeferCommunityNotFound(opts: {
  authReady: boolean;
  communityFetched: boolean;
  hasMarket: boolean;
}): boolean {
  if (opts.hasMarket) return false;
  if (!opts.authReady) return true;
  return !opts.communityFetched;
}

export function usePublicCommunityMarkets() {
  return useQuery({
    queryKey: PUBLIC_COMMUNITY_MARKETS_QUERY_KEY,
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
  const authenticated = !!userId;
  return useQuery({
    queryKey: communityMarketDetailQueryKey(marketId, accessToken, userId),
    queryFn: () =>
      fetchCommunityMarketDetail(marketId, accessToken, { authenticated }),
    enabled: authReady && marketId.startsWith("cm-"),
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
          queryFn: () => fetchCommunityMarketDetail(marketId, undefined, { authenticated: true }),
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
