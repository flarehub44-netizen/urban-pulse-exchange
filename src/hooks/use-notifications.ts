import { useQuery } from "@tanstack/react-query";
import type { ViaXNotification } from "@/store/viax-store";
import { getEngagementSnapshotFn } from "@/actions/account";
import { useEngagementSnapshot } from "@/hooks/use-engagement-snapshot";

function mapNotification(row: Record<string, unknown>): ViaXNotification {
  return {
    id: row.id as string,
    kind: row.kind as ViaXNotification["kind"],
    text: row.text as string,
    time: new Date(row.created_at as string).getTime(),
    read: row.read as boolean,
    marketId: (row.market_id as string) ?? undefined,
  };
}

export function useNotifications() {
  const snapshot = useEngagementSnapshot();

  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      if (snapshot.data) return snapshot.data.notifications as ViaXNotification[];
      const data = await getEngagementSnapshotFn({
        data: { notificationLimit: 20, betsLimit: 1, feedLimit: 1 },
      });
      return data.notifications as ViaXNotification[];
    },
    staleTime: 30_000,
  });
}

export { mapNotification };
