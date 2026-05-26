const memoryBuckets = new Map<string, number[]>();

/** Simple in-memory sliding-window rate limiter for edge handlers. */
export function assertRateLimit(
  key: string,
  options: { max: number; windowMs: number },
): Response | null {
  const now = Date.now();
  const windowStart = now - options.windowMs;
  const recent = (memoryBuckets.get(key) ?? []).filter((ts) => ts >= windowStart);

  if (recent.length >= options.max) {
    return new Response(JSON.stringify({ error: "rate_limited" }), {
      status: 429,
      headers: { "Content-Type": "application/json", "Retry-After": "60" },
    });
  }

  recent.push(now);
  memoryBuckets.set(key, recent);
  return null;
}
