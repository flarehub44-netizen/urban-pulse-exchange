import { useMutation, useQueryClient } from "@tanstack/react-query";
import { placeBetFn } from "@/actions/bets";
import type { Market, Side } from "@/store/viax-store";
import { invalidateAllUserQueries } from "@/lib/query-invalidation";

export function usePlaceBet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: {
      marketId: string;
      side: Side;
      stake: number;
      idempotencyKey?: string;
    }) => {
      // Persist the key on the variables object so React Query retries reuse
      // it instead of generating a new UUID each attempt — prevents double
      // billing on network timeouts.
      if (!vars.idempotencyKey) vars.idempotencyKey = crypto.randomUUID();
      return placeBetFn({
        data: {
          marketId: vars.marketId,
          side: vars.side,
          stake: vars.stake,
          idempotencyKey: vars.idempotencyKey,
        },
      });
    },

    onMutate: async ({ marketId, side, stake }) => {
      await queryClient.cancelQueries({ queryKey: ["markets"] });
      const previous = queryClient.getQueryData<Market[]>(["markets"]);
      queryClient.setQueryData<Market[]>(["markets"], (old) =>
        (old ?? []).map((m) =>
          m.id === marketId
            ? {
                ...m,
                pool: { ...m.pool, [side]: m.pool[side] + stake },
                participants: m.participants + 1,
              }
            : m,
        ),
      );
      return { previous };
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["markets"] });
      invalidateAllUserQueries(queryClient);
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["markets"], context.previous);
      }
    },
  });
}
