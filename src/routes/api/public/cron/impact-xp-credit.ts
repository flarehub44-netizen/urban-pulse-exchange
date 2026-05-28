import { createFileRoute } from "@tanstack/react-router";
import { assertCronAuth } from "@/lib/cron-auth.server";
import { runImpactXpCredit } from "@/lib/impact-cron.server";
import { assertRateLimit } from "@/lib/rate-limit.server";
import { logApiMetric } from "@/lib/structured-log.server";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function handleImpactXpCredit(request: Request) {
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const limited = await assertRateLimit(`cron:impact-xp-credit:${ip}`, {
    max: 30,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const denied = await assertCronAuth(request);
  if (denied) return denied;

  const started = Date.now();
  try {
    const result = await runImpactXpCredit(50);
    logApiMetric("cron.impact_xp_credit", {
      ok: true,
      durationMs: Date.now() - started,
      ip,
      processed: result.processed,
    });
    return json(result);
  } catch (e) {
    console.error("[ImpactXpCredit]", e);
    logApiMetric("cron.impact_xp_credit", { ok: false, durationMs: Date.now() - started, ip });
    return json({ error: e instanceof Error ? e.message : "impact_xp_credit_failed" }, 500);
  }
}

export const Route = createFileRoute("/api/public/cron/impact-xp-credit")({
  server: {
    handlers: {
      GET: ({ request }) => handleImpactXpCredit(request),
      POST: ({ request }) => handleImpactXpCredit(request),
    },
  },
});
