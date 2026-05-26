import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

/** Promotes allowlisted e-mails to admin on login and refreshes client caches. */
export function AdminAllowlistSync() {
  const { userId, isRegistered, authReady } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!authReady || !userId || !isRegistered) return;

    let cancelled = false;
    void (async () => {
      try {
        await supabase.rpc("try_sync_admin_allowlist");
        if (cancelled) return;
        await queryClient.invalidateQueries({ queryKey: ["me"] });
        await queryClient.invalidateQueries({ queryKey: ["account", "context"] });
      } catch {
        /* offline or migration pending */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authReady, userId, isRegistered, queryClient]);

  return null;
}
