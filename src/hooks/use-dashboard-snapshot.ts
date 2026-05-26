import { useQuery } from "@tanstack/react-query";
import { getDashboardSnapshotFn } from "@/actions/account";
import { useAuth } from "@/hooks/use-auth";

export function useDashboardSnapshot() {
  const { userId, authReady } = useAuth();

  return useQuery({
    queryKey: ["dashboard", "snapshot", userId],
    queryFn: async () => getDashboardSnapshotFn(),
    enabled: authReady && !!userId,
    staleTime: 15_000,
  });
}
