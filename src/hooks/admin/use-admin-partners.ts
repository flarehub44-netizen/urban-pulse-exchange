import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminApprovePartnerFn,
  adminListActivePartnersFn,
  adminListPartnerApplicationsFn,
  adminRejectPartnerFn,
  adminSetPartnerSubCreatorsFn,
  adminUpdatePartnerTermsFn,
  adminUpdateSettingFn,
} from "@/actions/admin/partners";

export type AdminActivePartner = {
  user_id: string;
  handle: string;
  name: string;
  slug: string;
  tier: string;
  revenue_share_pct: number;
  cpa_amount: number | null;
  balance: number;
  referrals_count: number;
  sub_creators_enabled: boolean;
};

export function useAdminPartnerApplications(enabled = true) {
  return useQuery({
    queryKey: ["admin", "partner-applications"],
    queryFn: () => adminListPartnerApplicationsFn(),
    enabled,
  });
}

export function useAdminActivePartners(enabled = true) {
  return useQuery({
    queryKey: ["admin", "active-partners"],
    queryFn: () => adminListActivePartnersFn() as Promise<AdminActivePartner[]>,
    enabled,
  });
}

export function useAdminApprovePartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      userId: string;
      tier?: string;
      slug?: string;
      revenueSharePct?: number;
      cpaAmount?: number | null;
      subCreatorsEnabled?: boolean;
    }) => adminApprovePartnerFn({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "partner-applications"] });
      qc.invalidateQueries({ queryKey: ["admin", "active-partners"] });
      qc.invalidateQueries({ queryKey: ["partner", "overview"] });
    },
  });
}

export function useAdminRejectPartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, note }: { userId: string; note?: string }) =>
      adminRejectPartnerFn({ data: { userId, note } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "partner-applications"] }),
  });
}

export function useAdminUpdatePartnerTerms() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { userId: string; revenueSharePct: number; cpaAmount: number | null }) =>
      adminUpdatePartnerTermsFn({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "active-partners"] }),
  });
}

export function useAdminSetPartnerSubCreators() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, enabled }: { userId: string; enabled: boolean }) =>
      adminSetPartnerSubCreatorsFn({ data: { userId, enabled } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "active-partners"] });
      qc.invalidateQueries({ queryKey: ["partner", "overview"] });
    },
  });
}

export function useAdminUpdateSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) =>
      adminUpdateSettingFn({ data: { key, value } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "platform-settings"] }),
  });
}
