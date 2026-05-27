import { supabase } from "@/integrations/supabase/client";
import { isFormalSessionUser, parseAuthSession, type AuthSessionState } from "@/lib/auth";

/** Returns the current Supabase session (no auto sign-in). */
export async function ensureAuthSession(): Promise<AuthSessionState> {
  if (typeof window === "undefined") {
    return parseAuthSession(null);
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user ?? null;
  if (user && !isFormalSessionUser(user)) {
    await supabase.auth.signOut();
    return parseAuthSession(null);
  }

  return parseAuthSession(session);
}
