import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminBanCpaFraudUsersFn,
  adminClearCpaFraudCasesFn,
  adminGetRiskAlertsFn,
  adminListCpaFraudCasesFn,
  adminListCpaReferralsFn,
  adminListPayerDocumentClustersFn,
  adminPayerDocumentClusterFn,
  adminSuspendCpaFraudPartnersFn,
  adminTagCpaFraudCaseFn,
} from "@/actions/admin/risk";

export type ReferringPartnerSummary = {
  partner_id: string;
  partner_handle: string | null;
  partner_slug: string | null;
  linked_referral_count: number;
};

export type AdminPayerLinkedAccount = {
  user_id: string;
  user_handle: string;
  user_name: string;
  created_at?: string;
  kyc_status?: string;
  balance?: number;
  banned?: boolean;
  first_seen_at?: string;
  last_seen_at?: string;
  partner_id?: string | null;
  partner_handle?: string | null;
  partner_slug?: string | null;
  referred_at?: string | null;
};

export type AdminPayerDocumentCluster = {
  ok?: boolean;
  cpf_hash: string | null;
  document_last4: string | null;
  document_length: number | null;
  linked_account_count: number;
  referring_partners?: ReferringPartnerSummary[];
  accounts: AdminPayerLinkedAccount[];
};

export type AdminPayerClusterSummary = {
  cpf_hash: string;
  document_last4: string | null;
  document_length: number | null;
  account_count: number;
  referring_partners?: ReferringPartnerSummary[];
  accounts: AdminPayerLinkedAccount[];
};

export type AdminCpaFraudCase = {
  flag_id: number;
  user_id: string;
  user_handle: string;
  user_name: string;
  partner_id: string | null;
  partner_handle: string | null;
  partner_slug: string | null;
  qualified_deposit_total: number;
  cpa_paid_at: string | null;
  status: "open" | "confirmed" | "cleared" | "resolved";
  risk_score: number;
  reasons: string[];
  notes: string | null;
  is_cpa_counted: boolean;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
  payer_document_last4?: string | null;
  payer_linked_account_count?: number;
  cpf_duplicate?: boolean;
};

export type AdminCpaReferral = {
  user_id: string;
  user_handle: string;
  user_name: string;
  partner_id: string;
  partner_handle: string | null;
  partner_slug: string | null;
  qualified_deposit_total: number;
  cpa_paid_at: string | null;
  flagged: boolean;
  flag_status: string | null;
  flag_risk_score: number | null;
  flag_reasons: string[];
  cpf_last4: string | null;
  cpf_duplicate: boolean;
  payer_document_last4?: string | null;
  payer_linked_account_count?: number;
};

export function useAdminRiskAlerts(enabled = true) {
  return useQuery({
    queryKey: ["admin", "risk-alerts"],
    queryFn: () => adminGetRiskAlertsFn(),
    enabled,
  });
}

export function useAdminCpaFraudCases(status?: string) {
  return useQuery({
    queryKey: ["admin", "cpa-fraud-cases", status ?? "all"],
    queryFn: () => adminListCpaFraudCasesFn({ data: { status } }) as Promise<AdminCpaFraudCase[]>,
  });
}

export function useAdminCpaReferrals(onlyFlagged = false) {
  return useQuery({
    queryKey: ["admin", "cpa-referrals", onlyFlagged],
    queryFn: () =>
      adminListCpaReferralsFn({ data: { onlyFlagged } }) as Promise<AdminCpaReferral[]>,
  });
}

export function useAdminPayerDocumentCluster(userId: string | null, enabled = false) {
  return useQuery({
    queryKey: ["admin", "payer-document-cluster", userId],
    queryFn: () =>
      adminPayerDocumentClusterFn({
        data: { userId: userId! },
      }) as Promise<AdminPayerDocumentCluster>,
    enabled: enabled && Boolean(userId),
  });
}

export function useAdminPayerDocumentClusters(enabled = true) {
  return useQuery({
    queryKey: ["admin", "payer-document-clusters"],
    queryFn: () => adminListPayerDocumentClustersFn() as Promise<AdminPayerClusterSummary[]>,
    enabled,
  });
}

export function useAdminTagCpaFraudCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      userId: string;
      partnerId?: string | null;
      status?: "open" | "confirmed" | "cleared" | "resolved";
      riskScore?: number;
      reasons?: string[];
      notes?: string;
    }) => adminTagCpaFraudCaseFn({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "cpa-fraud-cases"] });
      qc.invalidateQueries({ queryKey: ["admin", "cpa-referrals"] });
      qc.invalidateQueries({ queryKey: ["admin", "actions-log"] });
    },
  });
}

export function useAdminClearCpaFraudCases() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ actionNote }: { actionNote: string }) =>
      adminClearCpaFraudCasesFn({ data: { actionNote } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "cpa-fraud-cases"] });
      qc.invalidateQueries({ queryKey: ["admin", "cpa-referrals"] });
      qc.invalidateQueries({ queryKey: ["admin", "active-partners"] });
      qc.invalidateQueries({ queryKey: ["admin", "actions-log"] });
    },
  });
}

export function useAdminSuspendCpaFraudPartners() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ actionNote, partnerId }: { actionNote: string; partnerId?: string | null }) =>
      adminSuspendCpaFraudPartnersFn({ data: { actionNote, partnerId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "cpa-fraud-cases"] });
      qc.invalidateQueries({ queryKey: ["admin", "active-partners"] });
      qc.invalidateQueries({ queryKey: ["admin", "actions-log"] });
    },
  });
}

export function useAdminBanCpaFraudUsers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ actionNote }: { actionNote: string }) =>
      adminBanCpaFraudUsersFn({ data: { actionNote } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "cpa-fraud-cases"] });
      qc.invalidateQueries({ queryKey: ["admin", "cpa-referrals"] });
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "actions-log"] });
    },
  });
}

/** @deprecated Use useAdminBanCpaFraudUsers */
export const useAdminDeleteCpaFraudUsers = useAdminBanCpaFraudUsers;
