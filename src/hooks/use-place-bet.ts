import { useMutation, useQueryClient } from "@tanstack/react-query";
import { placeBetFn } from "@/actions/bets";
import type { Side } from "@/store/viax-store";
import { useViaX } from "@/store/viax-store";

export function usePlaceBet() {
  const queryClient = useQueryClient();
  const setMarkets = useViaX((s) => s.markets);

  return useMutation({
    mutationFn: ({ marketId, side, stake }: { marketId: string; side: Side; stake: number }) =>
      placeBetFn({ data: { marketId, side, stake } }),

    onMutate: ({ marketId, side, stake }) => {
      // Optimistic update: immediately reflect pool change in Zustand for smooth UI
      useViaX.setState((s) => ({
        markets: s.markets.map((m) =>
          m.id === marketId
            ? { ...m, pool: { ...m.pool, [side]: m.pool[side] + stake }, participants: m.participants + 1 }
            : m,
        ),
      }));
    },

    onSuccess: (result) => {
      // Reconcile with real values from DB
      const res = result as { pool_yes: number; pool_no: number; balance: number };
      queryClient.invalidateQueries({ queryKey: ["markets"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },

    onError: (_, { marketId, side, stake }) => {
      // Roll back optimistic update
      useViaX.setState((s) => ({
        markets: s.markets.map((m) =>
          m.id === marketId
            ? { ...m, pool: { ...m.pool, [side]: m.pool[side] - stake }, participants: m.participants - 1 }
            : m,
        ),
      }));
    },
  });
}
