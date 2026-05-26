import { useEffect, useRef } from "react";
import { useHasDeposited } from "@/hooks/use-has-deposited";
import { supabase } from "@/integrations/supabase/client";

/** Sends one in-app notification 24h after signup if user never deposited. */
export function useDepositNudge(userId?: string | null, isRegistered?: boolean) {
  const { data: hasDeposited } = useHasDeposited(userId);
  const sent = useRef(false);

  useEffect(() => {
    if (!userId || !isRegistered || hasDeposited !== false || sent.current) return;
    sent.current = true;
    void supabase.rpc("maybe_send_deposit_nudge").then(({ error }) => {
      if (error && import.meta.env.DEV) {
        console.warn("[deposit_nudge]", error.message);
      }
    });
  }, [userId, isRegistered, hasDeposited]);
}
