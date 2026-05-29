import { useMutation, useQueryClient } from "@tanstack/react-query";
import { placeBetFn } from "@/actions/bets";
import type { Market, Side } from "@/store/viax-store";
import { invalidateAllUserQueries } from "@/lib/query-invalidation";

export function usePlaceBet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      marketId,
      side,
      stake,
      idempotencyKey,
    }: {
      marketId: string;
      side: Side;
      stake: number;
      idempotencyKey?: string;
    }) => placeBetFn({ data: { marketId, side, stake, idempotencyKey: idempotencyKey ?? crypto.randomUUID() } }),

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
