import { createFileRoute } from "@tanstack/react-router";
import { assertCronAuth } from "@/lib/cron-auth.server";
import { runFootballResolve } from "@/lib/football-cron.server";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function handleFootballResolve(request: Request) {
  const denied = assertCronAuth(request);
  if (denied) return denied;

  try {
    const result = await runFootballResolve();
    return json(result);
  } catch (e) {
    console.error("[FootballResolve]", e);
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
