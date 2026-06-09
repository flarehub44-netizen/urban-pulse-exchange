import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getSupabaseCtx } from "@/integrations/supabase/context";
import { logApiMetric } from "@/lib/structured-log.server";

type AdminContext = Parameters<typeof getSupabaseCtx>[0];

export async function adminRpcCall<T>(
  endpoint: string,
  context: AdminContext,
  fn: (
    supabase: SupabaseClient<Database>,
  ) => PromiseLike<{ data: T | null; error: { message: string } | null }>,
): Promise<T> {
  const started = Date.now();
  const { supabase } = getSupabaseCtx(context);
  const { data, error } = await fn(supabase);
  if (error) {
    logApiMetric(endpoint, { ok: false, durationMs: Date.now() - started });
    throw new Error(error.message);
  }
  logApiMetric(endpoint, { ok: true, durationMs: Date.now() - started });
  return data as T;
}
