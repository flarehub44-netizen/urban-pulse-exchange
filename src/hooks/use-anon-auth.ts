import { useState, useEffect, useRef } from "react";
import { db as supabase } from "@/integrations/supabase/loose";
import { getStoredPartnerRef, clearStoredPartnerRef } from "@/lib/partner-attribution";
import { getBoundReferralSlug, markReferralBound } from "@/lib/anon-account-storage";

type DemoAuthState = { authReady: boolean; userId: string | null };

let initPromise: Promise<DemoAuthState> | null = null;

async function initDemoAuth(): Promise<DemoAuthState> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      void tryBindPartnerRef();
      return { authReady: true, userId: session.user.id };
    }

    return { authReady: true, userId: null };
  } catch {
    console.warn("[anon-auth] Session lookup failed; continuing in local demo mode.");
    return { authReady: true, userId: null };
  }
}

export function useAnonAuth() {
  const [authReady, setAuthReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const init = async () => {
      initPromise ??= initDemoAuth();
      const state = await initPromise;
      setUserId(state.userId);
      setAuthReady(true);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id ?? null);
      setAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { authReady, userId };
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
