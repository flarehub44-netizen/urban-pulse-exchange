import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

let _client: ReturnType<typeof createClient<Database>> | null = null;

/** Returns the Supabase service-role client (bypasses RLS). Server-side only. */
export function getServiceClient() {
  if (!_client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase service role not configured");
    _client = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}
