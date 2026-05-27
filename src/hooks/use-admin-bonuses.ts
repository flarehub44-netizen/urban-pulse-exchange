import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AdminBonusOverview = {
  period_days: number;
  bonus_cash_total: number;
  spin_cash_total: number;
  spin_xp_total: number;
  spin_count: number;
  impulse_cash_total: number;
  impulse_count: number;
  admin_grants_cash: number;
  admin_grants_xp: number;
  unique_recipients: number;
  email_xp_claims_all_time: number;
  email_xp_total_all_time: number;
};

export type AdminBonusLedgerRow = {
  id: string;
  user_id: string;
  username: string;
  kind: "bonus_tx" | "casino_spin" | "impulse_deposit" | "admin_grant";
  source: string | null;
  cash_amount: number;
  xp_amount: number;
  label: string;
  created_at: string;
};

export type CasinoSpinWeight = {
  key: string;
  weight: number;
  balance: number;
  xp: number;
  near_miss: boolean;
};

export function useAdminBonusOverview(days = 30, enabled = true) {
  return useQuery({
    queryKey: ["admin", "bonus-overview", days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_bonus_overview", {
        p_days: days,
      });
      if (error) throw error;
      return data as AdminBonusOverview;
    },
    enabled,
  });
}

export function useAdminBonusLedger(limit = 100, enabled = true) {
  return useQuery({
    queryKey: ["admin", "bonus-ledger", limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_bonus_ledger", {
        p_limit: limit,
      });
      if (error) throw error;
      return (data ?? []) as AdminBonusLedgerRow[];
    },
    enabled,
  });
}

export function useAdminGrantUserBonus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      amount,
      kind,
      reason,
    }: {
      userId: string;
      amount: number;
      kind: "balance" | "xp";
      reason?: string;
    }) => {
      const { data, error } = await supabase.rpc("admin_grant_user_bonus", {
        p_user_id: userId,
        p_amount: amount,
        p_kind: kind,
        p_reason: reason ?? undefined,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "bonus-overview"] });
      qc.invalidateQueries({ queryKey: ["admin", "bonus-ledger"] });
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

export function useAdminUpdateSpinWeights() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (weights: CasinoSpinWeight[]) => {
      const { data, error } = await supabase.rpc("admin_update_casino_spin_weights", {
        p_weights: weights,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "platform-settings"] });
    },
  });
}
