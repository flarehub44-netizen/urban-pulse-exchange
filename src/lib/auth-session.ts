import { supabase } from "@/integrations/supabase/client";
import { parseAuthSession, type AuthSessionState } from "@/lib/auth";

/** Returns the current Supabase session without creating a guest/anonymous session. */
export async function ensureAuthSession(): Promise<AuthSessionState> {
  if (typeof window === "undefined") {
    return parseAuthSession(null);
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  return parseAuthSession(session);
}
