import { useMutation, useQueryClient } from "@tanstack/react-query";
import { db as supabase } from "@/integrations/supabase/loose";

export function useClaimAdminInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.rpc("claim_admin_invite", {
        p_code: code.trim(),
      });
      if (error) throw error;
      return data as { ok: boolean; user_id: string };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["me"] });
      void queryClient.invalidateQueries({ queryKey: ["account", "context"] });
    },
  });
}

export function useSyncAdminAllowlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("try_sync_admin_allowlist");
      if (error) throw error;
      return data as { is_admin: boolean };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["me"] });
      void queryClient.invalidateQueries({ queryKey: ["account", "context"] });
    },
  });
}
