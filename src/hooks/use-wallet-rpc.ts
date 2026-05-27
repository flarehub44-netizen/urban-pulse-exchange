import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateWalletQueries } from "@/lib/query-invalidation";

export function useWalletDeposit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      throw new Error("Use a aba Depositar na carteira para depósito Pix real.");
    },
    onSuccess: () => {
      invalidateWalletQueries(queryClient);
    },
  });
}

export function useWalletWithdraw() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      throw new Error("Use a aba Sacar na carteira para saque Pix real.");
    },
    onSuccess: () => {
      invalidateWalletQueries(queryClient);
    },
  });
}
