import { createFileRoute } from "@tanstack/react-router";
import { assertCronAuth } from "@/lib/cron-auth.server";
import { runFootballResolve } from "@/lib/football-cron.server";
import { assertRateLimit } from "@/lib/rate-limit.server";
import { logApiMetric } from "@/lib/structured-log.server";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function handleFootballResolve(request: Request) {
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const limited = await assertRateLimit(`cron:football-resolve:${ip}`, { max: 30, windowMs: 60_000 });
  if (limited) return limited;

  const denied = await assertCronAuth(request);
  if (denied) return denied;

  const started = Date.now();
  try {
    const result = await runFootballResolve();
    logApiMetric("cron.football_resolve", {
      ok: true,
      durationMs: Date.now() - started,
      ip,
    });
    return json(result);
  } catch (e) {
    console.error("[FootballResolve]", e);
    logApiMetric("cron.football_resolve", { ok: false, durationMs: Date.now() - started, ip });
    return json({ error: e instanceof Error ? e.message : "resolve_failed" }, 500);
  }
}

export const Route = createFileRoute("/api/public/cron/football-resolve")({
  server: {
    handlers: {
      GET: ({ request }) => handleFootballResolve(request),
      POST: ({ request }) => handleFootballResolve(request),
    },
  },
});
