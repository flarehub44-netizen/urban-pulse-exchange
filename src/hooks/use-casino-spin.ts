import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { casinoDailySpinFn, casinoQuickDepositFn, type SpinResult } from "@/actions/casino";
import { useAuth } from "@/hooks/use-auth";
import { invalidateWalletQueries } from "@/lib/query-invalidation";

export function useCasinoSpinStatus() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["casino", "status", userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("casino_spin_status");
      if (error) throw error;
      return data as {
        enabled?: boolean;
        daily_available?: boolean;
        deposit_bonus_available?: boolean;
        opt_out?: boolean;
      };
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useCasinoDailySpin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => casinoDailySpinFn(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["casino"] });
      invalidateWalletQueries(qc);
    },
  });
}

export function useCasinoQuickDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      amount,
      context,
    }: {
      amount: number;
      context?: "low_balance" | "after_loss" | "after_spin";
    }) =>
      casinoQuickDepositFn({
        data: { amount, context: context ?? "low_balance" },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["casino"] });
      invalidateWalletQueries(qc);
    },
  });
}
