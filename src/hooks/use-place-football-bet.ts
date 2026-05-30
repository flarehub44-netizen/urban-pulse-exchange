import { useMutation, useQueryClient } from "@tanstack/react-query";
import { placeFootballBetFn } from "@/actions/football";
import type { FootballOutcome } from "@/lib/football-parimutuel";
import { invalidateAllUserQueries } from "@/lib/query-invalidation";

export function usePlaceFootballBet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: {
      marketId: string;
      outcome: FootballOutcome;
      stake: number;
      idempotencyKey?: string;
    }) => {
      // Persist key on variables so React Query retries reuse the same UUID
      // and the server-side unique index dedupes — no double billing.
      if (!vars.idempotencyKey) vars.idempotencyKey = crypto.randomUUID();
      return placeFootballBetFn({
        data: {
          marketId: vars.marketId,
          outcome: vars.outcome,
          stake: vars.stake,
          idempotencyKey: vars.idempotencyKey,
        },
      });
    },

    onSuccess: (_, { marketId }) => {
      queryClient.invalidateQueries({ queryKey: ["football-markets"] });
      queryClient.invalidateQueries({ queryKey: ["football-markets", marketId] });
      queryClient.invalidateQueries({ queryKey: ["football-bets"] });
      invalidateAllUserQueries(queryClient);
    },
  });
}
