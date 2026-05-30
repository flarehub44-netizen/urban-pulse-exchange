import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

let _client: ReturnType<typeof createClient<Database>> | null = null;

/** Returns the Supabase service-role client (bypasses RLS). Server-side only. */
export function getServiceClient() {
  if (!_client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      const missing = [
        ...(!url ? ["SUPABASE_URL"] : []),
        ...(!key ? ["SUPABASE_SERVICE_ROLE_KEY"] : []),
      ];
      throw new Error(`Supabase service role not configured (missing: ${missing.join(", ")})`);
    }
    _client = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}
