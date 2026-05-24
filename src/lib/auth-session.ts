import { supabase } from "@/integrations/supabase/client";
import { parseAuthSession, type AuthSessionState } from "@/lib/auth";

let bootPromise: Promise<AuthSessionState> | null = null;

/** Ensures a Supabase session exists (anonymous if needed). Call before protected routes. */
export async function ensureAuthSession(): Promise<AuthSessionState> {
  if (typeof window === "undefined") {
    return parseAuthSession(null);
  }

  const {
    data: { session: existing },
  } = await supabase.auth.getSession();
  if (existing) {
    return parseAuthSession(existing);
  }

  if (!bootPromise) {
    bootPromise = (async () => {
      try {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) {
          console.warn("[auth] signInAnonymously failed:", error.message);
          return parseAuthSession(null);
        }
        return parseAuthSession(data.session);
      } catch (err) {
        console.warn("[auth] ensureAuthSession failed:", err);
        return parseAuthSession(null);
      }
    })();
  }

  return bootPromise;
}

export function resetAuthBoot() {
  bootPromise = null;
}
