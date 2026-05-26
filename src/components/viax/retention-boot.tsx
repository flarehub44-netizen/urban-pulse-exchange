import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { recordComebackFn } from "@/actions/retention";

export const COMEBACK_KEY = "viax_comeback_days";

/** Registra retorno após 3+ dias e persiste days_away no localStorage para o ComebackBanner. */
export function RetentionBoot() {
  const { userId, authReady } = useAuth();
  const ran = useRef(false);

  useEffect(() => {
    if (!authReady || !userId || ran.current) return;
    ran.current = true;
    recordComebackFn({})
      .then((res) => {
        if (res?.comeback && (res.days_away ?? 0) >= 3) {
          localStorage.setItem(COMEBACK_KEY, String(res.days_away));
        }
      })
      .catch(() => {
        /* offline / migration pendente */
      });
  }, [authReady, userId]);

  return null;
}
