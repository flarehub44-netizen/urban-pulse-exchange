import { createFileRoute } from "@tanstack/react-router";
import { assertCronAuth } from "@/lib/cron-auth.server";
import { assertRateLimit } from "@/lib/rate-limit.server";
import { getServiceClient } from "@/lib/supabase-service.server";
import { logApiMetric } from "@/lib/structured-log.server";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function handleFraudClusterSweep(request: Request) {
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const limited = await assertRateLimit(`cron:fraud-cluster-sweep:${ip}`, {
    max: 10,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const denied = await assertCronAuth(request);
  if (denied) return denied;

  const started = Date.now();
  try {
    const service = getServiceClient();
    const { data, error } = await service.rpc("service_fraud_cluster_sweep");
    if (error) {
      console.error("[FraudClusterSweep]", error.message);
      return json({ error: error.message }, 500);
    }
    logApiMetric("cron.fraud_cluster_sweep", {
      ok: true,
      durationMs: Date.now() - started,
      ip,
    });
    return json(data ?? { ok: true });
  } catch (e) {
    console.error("[FraudClusterSweep]", e);
    logApiMetric("cron.fraud_cluster_sweep", { ok: false, durationMs: Date.now() - started, ip });
    return json({ error: e instanceof Error ? e.message : "sweep_failed" }, 500);
  }
}

export const Route = createFileRoute("/api/public/cron/fraud-cluster-sweep")({
  server: {
    handlers: {
      GET: ({ request }) => handleFraudClusterSweep(request),
      POST: ({ request }) => handleFraudClusterSweep(request),
    },
  },
});
