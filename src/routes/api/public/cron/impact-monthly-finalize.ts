import { createFileRoute } from "@tanstack/react-router";
import { assertCronAuth } from "@/lib/cron-auth.server";
import { runImpactMonthlyFinalize } from "@/lib/impact-cron.server";
import { assertRateLimit } from "@/lib/rate-limit.server";
import { logApiMetric } from "@/lib/structured-log.server";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function handleImpactMonthlyFinalize(request: Request) {
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const limited = await assertRateLimit(`cron:impact-monthly-finalize:${ip}`, {
    max: 10,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const denied = await assertCronAuth(request);
  if (denied) return denied;

  const started = Date.now();
  try {
    const result = await runImpactMonthlyFinalize();
    logApiMetric("cron.impact_monthly_finalize", {
      ok: true,
      durationMs: Date.now() - started,
      ip,
      winners: result.winners_inserted,
    });
    return json(result);
  } catch (e) {
    console.error("[ImpactMonthlyFinalize]", e);
    logApiMetric("cron.impact_monthly_finalize", {
      ok: false,
      durationMs: Date.now() - started,
      ip,
    });
    return json({ error: e instanceof Error ? e.message : "impact_monthly_finalize_failed" }, 500);
  }
}

export const Route = createFileRoute("/api/public/cron/impact-monthly-finalize")({
  server: {
    handlers: {
      GET: ({ request }) => handleImpactMonthlyFinalize(request),
      POST: ({ request }) => handleImpactMonthlyFinalize(request),
    },
  },
});
