import { createClient } from "@supabase/supabase-js";

type RateLimitResult = {
  limited?: boolean;
  retry_after_seconds?: number;
};

function getServiceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Distributed sliding-window rate limiter backed by Postgres. */
export async function assertRateLimit(
  key: string,
  options: { max: number; windowMs: number },
): Promise<Response | null> {
  const service = getServiceClient();
  if (!service) return null;

  const windowSeconds = Math.max(1, Math.floor(options.windowMs / 1000));
  const { data, error } = await service.rpc("service_assert_rate_limit", {
    p_key: key,
    p_max: options.max,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("[RateLimit] distributed check failed", { key, error: error.message });
    return null;
  }

  const result = (data ?? {}) as RateLimitResult;
  if (result.limited) {
    return new Response(JSON.stringify({ error: "rate_limited" }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(result.retry_after_seconds ?? windowSeconds),
      },
    });
  }
  return null;
}
