import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useAnonAuth() {
  const [authReady, setAuthReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
        setAuthReady(true);
      } else {
        const { data } = await supabase.auth.signInAnonymously();
        setUserId(data.user?.id ?? null);
        setAuthReady(true);
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id ?? null);
      if (session) setAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { authReady, userId };
}
