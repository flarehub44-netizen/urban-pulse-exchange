import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminFreezeAccountFn,
  adminGetUsersListFn,
  adminSetBetLimitFn,
  adminUpdateKycStatusFn,
} from "@/actions/admin/users";

export type AdminUserRow = {
  id: string;
  username: string;
  balance: number;
  is_admin: boolean;
  is_partner?: boolean;
  kyc_status: string;
  risk_score: number;
  frozen: boolean;
  bet_limit: number | null;
  volume: number;
};

export function useAdminUsers(enabled = true) {
  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => adminGetUsersListFn() as Promise<AdminUserRow[]>,
    enabled,
  });
}

export function useAdminFreezeAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, frozen }: { userId: string; frozen: boolean }) =>
      adminFreezeAccountFn({ data: { userId, frozen } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useAdminSetBetLimit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, limit }: { userId: string; limit: number }) =>
      adminSetBetLimitFn({ data: { userId, limit } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useAdminUpdateKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, status, notes }: { userId: string; status: string; notes?: string }) =>
      adminUpdateKycStatusFn({ data: { userId, status, notes } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}
