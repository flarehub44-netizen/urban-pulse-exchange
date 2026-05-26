import { createFileRoute } from "@tanstack/react-router";
import { assertCronAuth } from "@/lib/cron-auth.server";
import { runFootballSync } from "@/lib/football-cron.server";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function handleFootballSync(request: Request) {
  const denied = assertCronAuth(request);
  if (denied) return denied;

  try {
    const result = await runFootballSync();
    const status = result.ok === false ? 500 : 200;
    return json(result, status);
  } catch (e) {
    console.error("[FootballSync]", e);
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
