import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { parseAuthSession, type AuthSessionState } from "@/lib/auth";
import { ensureAuthSession } from "@/lib/auth-session";
import { getStoredPartnerRef, clearStoredPartnerRef } from "@/lib/partner-attribution";
import { getBoundReferralSlug, markReferralBound } from "@/lib/anon-account-storage";

export type UseAuthResult = AuthSessionState & {
  authReady: boolean;
};

export function useAuth(): UseAuthResult {
  const [authReady, setAuthReady] = useState(false);
  const [state, setState] = useState<AuthSessionState>(() => parseAuthSession(null));
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    ensureAuthSession().then((next) => {
      setState(next);
      setAuthReady(true);
      if (next.userId) void tryBindPartnerRef();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = parseAuthSession(session);
      setState(next);
      setAuthReady(true);
      if (next.userId && next.isRegistered) void tryBindPartnerRef();
    });

    return () => subscription.unsubscribe();
  }, []);

  return useMemo(() => ({ ...state, authReady }), [state, authReady]);
}

async function tryBindPartnerRef() {
  const ref = getStoredPartnerRef();
  if (!ref?.slug) return;
  if (getBoundReferralSlug() === ref.slug) {
    clearStoredPartnerRef();
    return;
  }
  const { data, error } = await supabase.rpc("bind_referral_attribution", {
    p_slug: ref.slug,
    p_campaign_id: ref.campaignId ?? null,
  });
  if (!error) {
    const payload = data as { ok?: boolean; reason?: string };
    if (payload?.ok) {
      markReferralBound(ref.slug);
      clearStoredPartnerRef();
    } else if (payload?.reason === "already_attributed") {
      markReferralBound(ref.slug);
      clearStoredPartnerRef();
    }
  }
}
