import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { resolveSupabasePublicEnv } from "./env";

function createSupabaseClient() {
  const { url, publishableKey } = resolveSupabasePublicEnv();

  return createClient<Database>(url, publishableKey, {
    auth: {
      storage: typeof window !== "undefined" ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: typeof window !== "undefined",
      flowType: "pkce",
    },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
