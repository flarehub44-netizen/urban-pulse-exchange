import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { getAccountContextFn } from "@/actions/account";

export type AccountContext = {
  auth: {
    authenticated: boolean;
    registered: boolean;
    anonymous: boolean;
    email?: string | null;
  };
  trader: {
    profile_id: string;
    handle: string;
    name: string;
    account_kind: string;
  };
  partner: {
    role: "none" | "applicant" | "partner";
    status?: string;
    slug?: string;
    tier?: string;
    verified?: boolean;
    balance?: number;
  };
  admin: {
    is_admin: boolean;
    can_claim_invite?: boolean;
  };
};

export function useAccountContext(enabled = true) {
  const { userId, authReady } = useAuth();

  return useQuery({
    queryKey: ["account", "context", userId],
    queryFn: async () => {
      const data = await getAccountContextFn();
      return data as AccountContext;
    },
    enabled: enabled && authReady && !!userId,
    staleTime: 30_000,
  });
}
