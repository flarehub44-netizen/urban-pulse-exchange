import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { parseAuthSession, type AuthSessionState } from "@/lib/auth";

export type UseAuthPublicResult = AuthSessionState & {
  authReady: boolean;
};

export function useAuthPublic(): UseAuthPublicResult {
  const [authReady, setAuthReady] = useState(false);
  const [state, setState] = useState<AuthSessionState>(() => parseAuthSession(null));

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState(parseAuthSession(session));
      setAuthReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(parseAuthSession(session));
      setAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  return useMemo(() => ({ ...state, authReady }), [state, authReady]);
}
