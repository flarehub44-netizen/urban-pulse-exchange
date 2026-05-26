import { useQuery } from "@tanstack/react-query";
import type { Side } from "@/store/viax-store";
import type { MarketStatus } from "@/lib/market-status";
import { getEngagementSnapshotFn } from "@/actions/account";
import { useEngagementSnapshot } from "@/hooks/use-engagement-snapshot";

export interface OpenBet {
  id: string;
  marketId: string;
  marketQuestion: string;
  marketRegion: string;
  marketStatus: MarketStatus;
  marketEndsAt: number;
  poolYes: number;
  poolNo: number;
  side: Side;
  stake: number;
  share: number | null;
  payout: number | null;
  note: string | null;
  createdAt: number;
}

export function useBets(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const snapshot = useEngagementSnapshot(enabled);

  return useQuery({
    queryKey: ["bets"],
    enabled,
    queryFn: async () => {
      if (snapshot.data) return snapshot.data.bets as OpenBet[];
      const data = await getEngagementSnapshotFn({
        data: { betsLimit: 100, feedLimit: 1, notificationLimit: 1 },
      });
      return data.bets as OpenBet[];
    },
    staleTime: 15_000,
  });
}
