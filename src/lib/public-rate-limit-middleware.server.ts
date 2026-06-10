import { createMiddleware } from "@tanstack/start-client-core";
import { assertRateLimit } from "@/lib/rate-limit.server";
import { AppError } from "@/lib/server-errors";

function getClientIp(request?: Request): string {
  return (
    request?.headers.get("cf-connecting-ip") ??
    request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

/** Rate limit for unauthenticated public serverFns (per IP). */
export function publicRateLimitMiddleware(
  bucket: string,
  options: { max: number; windowMs: number } = { max: 60, windowMs: 60_000 },
) {
  return createMiddleware({ type: "function" }).server(async (opts) => {
    const request = (opts as unknown as { request?: Request }).request;
    const ip = getClientIp(request);
    const limited = await assertRateLimit(`public:${bucket}:${ip}`, options);
    if (limited) {
      throw new AppError("RATE_LIMITED", "Muitas tentativas. Aguarde um momento.", 429);
    }
    return opts.next();
  });
}
