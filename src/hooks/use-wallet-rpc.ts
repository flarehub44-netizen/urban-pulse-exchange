import { useMutation, useQueryClient } from "@tanstack/react-query";
import { db as supabase } from "@/integrations/supabase/loose";

export function useWalletDeposit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (amount: number) => {
      const { data, error } = await supabase.rpc("wallet_deposit", { p_amount: amount });
      if (error) throw error;
      return data as { tx_id: string; balance: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useWalletWithdraw() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (amount: number) => {
      const { data, error } = await supabase.rpc("wallet_withdraw", { p_amount: amount });
      if (error) throw error;
      return data as { tx_id: string; balance: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}
