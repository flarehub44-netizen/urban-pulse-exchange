import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

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
      const { data, error } = await supabase.rpc("get_my_account_context");
      if (error) throw error;
      return data as AccountContext;
    },
    enabled: enabled && authReady && !!userId,
    staleTime: 30_000,
  });
}
