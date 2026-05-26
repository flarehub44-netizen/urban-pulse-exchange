import { useQuery } from "@tanstack/react-query";
import { getEngagementSnapshotFn } from "@/actions/account";

export function useEngagementSnapshot(enabled = true) {
  return useQuery({
    queryKey: ["engagement", "snapshot"],
    queryFn: async () =>
      getEngagementSnapshotFn({ data: { betsLimit: 100, feedLimit: 40, notificationLimit: 20 } }),
    enabled,
    staleTime: 15_000,
  });
}
