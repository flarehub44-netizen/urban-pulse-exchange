import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminGetBonusLedgerFn,
  adminGetBonusOverviewFn,
  adminGrantUserBonusFn,
  adminUpdateCasinoSpinWeightsFn,
} from "@/actions/admin/bonuses";

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
    queryFn: () =>
      adminGetBonusOverviewFn({ data: { days } }) as Promise<AdminBonusOverview>,
    enabled,
  });
}

export function useAdminBonusLedger(limit = 100, enabled = true) {
  return useQuery({
    queryKey: ["admin", "bonus-ledger", limit],
    queryFn: () =>
      adminGetBonusLedgerFn({ data: { limit } }) as Promise<AdminBonusLedgerRow[]>,
    enabled,
  });
}

export function useAdminGrantUserBonus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      amount,
      kind,
      reason,
    }: {
      userId: string;
      amount: number;
      kind: "balance" | "xp";
      reason?: string;
    }) => adminGrantUserBonusFn({ data: { userId, amount, kind, reason } }),
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
    mutationFn: (weights: CasinoSpinWeight[]) =>
      adminUpdateCasinoSpinWeightsFn({ data: { weights } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "platform-settings"] });
    },
  });
}
