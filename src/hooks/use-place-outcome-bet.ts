import { useMutation, useQueryClient } from "@tanstack/react-query";
import { placeOutcomeBetFn } from "@/actions/outcome-bets";
import { catalogQueryKey } from "@/hooks/use-catalog-markets";

export function usePlaceOutcomeBet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      marketId: string;
      outcomeId: string;
      stake: number;
      idempotencyKey?: string;
    }) =>
      placeOutcomeBetFn({
        data: {
          marketId: input.marketId,
          outcomeId: input.outcomeId,
          stake: input.stake,
          idempotencyKey: input.idempotencyKey,
        },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["unified-catalog"] });
      void qc.invalidateQueries({ queryKey: ["prediction-market"] });
    },
  });
}
