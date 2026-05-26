import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { invalidateWalletQueries } from "@/lib/query-invalidation";

export function useWalletDeposit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (amount: number) => {
      const { data, error } = await supabase.rpc("wallet_deposit", { p_amount: amount });
      if (error) throw error;
      return data as { tx_id: string; balance: number };
    },
    onSuccess: () => {
      invalidateWalletQueries(queryClient);
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
      invalidateWalletQueries(queryClient);
    },
  });
}
