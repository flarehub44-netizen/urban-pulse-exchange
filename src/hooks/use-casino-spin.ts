import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { casinoDailySpinFn, type SpinResult } from "@/actions/casino";
import { useAnonAuth } from "@/hooks/use-anon-auth";

export function useCasinoSpinStatus() {
  const { userId } = useAnonAuth();
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
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
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
    }) => {
      const { data, error } = await supabase.rpc("casino_quick_deposit", {
        p_amount: amount,
        p_context: context ?? "low_balance",
      });
      if (error) throw error;
      return data as { balance: number; bonus_spin?: SpinResult };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["casino"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}
