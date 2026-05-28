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
    return null; // service role not configured — soft fail
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
