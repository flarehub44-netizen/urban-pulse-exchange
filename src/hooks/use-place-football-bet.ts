import { useMutation, useQueryClient } from "@tanstack/react-query";
import { placeFootballBetFn } from "@/actions/football";
import type { FootballOutcome } from "@/lib/football-parimutuel";

export function usePlaceFootballBet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      marketId,
      outcome,
      stake,
    }: {
      marketId: string;
      outcome: FootballOutcome;
      stake: number;
    }) => placeFootballBetFn({ data: { marketId, outcome, stake } }),

    onSuccess: (_, { marketId }) => {
      queryClient.invalidateQueries({ queryKey: ["football-markets"] });
      queryClient.invalidateQueries({ queryKey: ["football-markets", marketId] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["football-bets"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}
