import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getActiveCryptoSlotFn, placeCryptoSlotBetFn } from "@/actions/crypto-slots";

export function useActiveCryptoSlot() {
  return useQuery({
    queryKey: ["crypto-slot", "active"],
    queryFn: () => getActiveCryptoSlotFn(),
    staleTime: 5_000,
    refetchInterval: 10_000,
  });
}

export function usePlaceCryptoSlotBet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: placeCryptoSlotBetFn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["crypto-slot"] });
      void qc.invalidateQueries({ queryKey: ["unified-catalog"] });
      void qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}
