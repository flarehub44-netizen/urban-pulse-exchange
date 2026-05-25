import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { recordComebackFn } from "@/actions/retention";

/** Registra retorno após 3+ dias e dispara notificação de comeback (se aplicável). */
export function RetentionBoot() {
  const { userId, authReady } = useAuth();
  const ran = useRef(false);

  useEffect(() => {
    if (!authReady || !userId || ran.current) return;
    ran.current = true;
    recordComebackFn({}).catch(() => {
      /* offline / migration pendente */
    });
  }, [authReady, userId]);

  return null;
}
