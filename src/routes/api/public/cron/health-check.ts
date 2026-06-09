import { createFileRoute } from "@tanstack/react-router";
import { assertCronAuth } from "@/lib/cron-auth.server";
import { assertRateLimit } from "@/lib/rate-limit.server";
import { runHealthCheck } from "@/lib/health-check.server";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function handleHealthCheck(request: Request) {
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const limited = await assertRateLimit(`cron:health-check:${ip}`, {
    max: 20,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const denied = await assertCronAuth(request);
  if (denied) return denied;

  try {
    const result = await runHealthCheck();
    return json(result, result.ok ? 200 : 503);
  } catch (e) {
    console.error("[HealthCheck]", e);
    return json({ ok: false, error: e instanceof Error ? e.message : "health_failed" }, 500);
  }
}

export const Route = createFileRoute("/api/public/cron/health-check")({
  server: {
    handlers: {
      GET: ({ request }) => handleHealthCheck(request),
      POST: ({ request }) => handleHealthCheck(request),
    },
  },
});
