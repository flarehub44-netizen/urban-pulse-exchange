import { createFileRoute } from "@tanstack/react-router";
import { assertCronAuth } from "@/lib/cron-auth.server";
import { runFootballSync } from "@/lib/football-cron.server";
import { assertRateLimit } from "@/lib/rate-limit.server";
import { logApiMetric } from "@/lib/structured-log.server";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function handleFootballSync(request: Request) {
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const limited = assertRateLimit(`cron:football-sync:${ip}`, { max: 30, windowMs: 60_000 });
  if (limited) return limited;

  const denied = assertCronAuth(request);
  if (denied) return denied;

  const started = Date.now();
  try {
    const result = await runFootballSync();
    const status = result.ok === false ? 500 : 200;
    logApiMetric("cron.football_sync", {
      ok: status < 500,
      durationMs: Date.now() - started,
      ip,
    });
    return json(result, status);
  } catch (e) {
    console.error("[FootballSync]", e);
    logApiMetric("cron.football_sync", { ok: false, durationMs: Date.now() - started, ip });
    return json({ error: e instanceof Error ? e.message : "sync_failed" }, 500);
  }
}

export const Route = createFileRoute("/api/public/cron/football-sync")({
  server: {
    handlers: {
      GET: ({ request }) => handleFootballSync(request),
      POST: ({ request }) => handleFootballSync(request),
    },
  },
});
