import type { QueryClient } from "@tanstack/react-query";

export function invalidateWalletQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["me"] });
  queryClient.invalidateQueries({ queryKey: ["transactions"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard", "snapshot"] });
}

export function invalidateEngagementQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["bets"] });
  queryClient.invalidateQueries({ queryKey: ["feed"] });
  queryClient.invalidateQueries({ queryKey: ["notifications"] });
  queryClient.invalidateQueries({ queryKey: ["engagement", "snapshot"] });
}

export function invalidateAccountContextQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["account", "context"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard", "snapshot"] });
}

export function invalidateAllUserQueries(queryClient: QueryClient) {
  invalidateWalletQueries(queryClient);
  invalidateEngagementQueries(queryClient);
  invalidateAccountContextQueries(queryClient);
}
