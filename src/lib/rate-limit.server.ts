import { getServiceClient } from "@/lib/supabase-service.server";

type RateLimitResult = {
  limited?: boolean;
  retry_after_seconds?: number;
};

/** Distributed sliding-window rate limiter backed by Postgres. */
export async function assertRateLimit(
  key: string,
  options: { max: number; windowMs: number },
): Promise<Response | null> {
  let service: ReturnType<typeof getServiceClient>;
  try {
    service = getServiceClient();
  } catch {
    // F03: fail-closed in production — a missing service role disables all rate
    // limiting, which is a silent DoS vector on high-traffic endpoints.
    if (process.env.NODE_ENV === "production") {
      console.error("[RateLimit] FATAL: SUPABASE_SERVICE_ROLE_KEY not configured in production — refusing request to protect the system");
      return new Response(JSON.stringify({ error: "service_unavailable" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }
    return null; // soft fail only in non-production environments
  }

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
