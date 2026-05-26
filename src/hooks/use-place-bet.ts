import { useMutation, useQueryClient } from "@tanstack/react-query";
import { placeBetFn } from "@/actions/bets";
import type { Market, Side } from "@/store/viax-store";

export function usePlaceBet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ marketId, side, stake }: { marketId: string; side: Side; stake: number }) =>
      placeBetFn({ data: { marketId, side, stake } }),

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
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["markets"], context.previous);
      }
    },
  });
}
