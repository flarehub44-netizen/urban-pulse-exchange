import { useQuery } from "@tanstack/react-query";
import type { FeedPost } from "@/store/viax-store";
import { getEngagementSnapshotFn } from "@/actions/account";
import { useEngagementSnapshot } from "@/hooks/use-engagement-snapshot";

export function useFeed(marketId?: string) {
  const snapshot = useEngagementSnapshot(!marketId);

  return useQuery({
    queryKey: ["feed", marketId ?? "all"],
    queryFn: async () => {
      if (!marketId && snapshot.data) return snapshot.data.feed as FeedPost[];
      const data = await getEngagementSnapshotFn({
        data: { marketId, feedLimit: 40, notificationLimit: 1, betsLimit: 1 },
      });
      return data.feed as FeedPost[];
    },
    staleTime: 15_000,
  });
}
