import { getServiceClient } from "@/lib/supabase-service.server";
import { logApiMetric } from "@/lib/structured-log.server";

export type HealthCheckResult = {
  ok: boolean;
  checks: {
    lifecycle_ok: boolean;
    minutes_since_lifecycle_tick: number | null;
    pending_intents_over_24h: number;
    webhook_failures_24h: number;
    lifecycle: Record<string, unknown> | null;
  };
};

export async function runHealthCheck(): Promise<HealthCheckResult> {
  const started = Date.now();
  const service = getServiceClient();

  const [lifecycleRes, pendingIntentsRes, webhookFailuresRes] = await Promise.all([
    service.rpc("get_lifecycle_health"),
    service
      .from("payment_intents")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .lt("created_at", new Date(Date.now() - 24 * 60 * 60_000).toISOString()),
    service
      .from("syncpay_webhook_events")
      .select("id", { count: "exact", head: true })
      .neq("processing_status", "ok")
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60_000).toISOString()),
  ]);

  const lifecycle = (lifecycleRes.data ?? null) as Record<string, unknown> | null;
  const lastTickAt = lifecycle?.last_tick_at as string | undefined;
  const minutesSinceTick =
    lastTickAt != null
      ? (Date.now() - new Date(lastTickAt).getTime()) / 60_000
      : Number.POSITIVE_INFINITY;

  const checks = {
    lifecycle_ok: minutesSinceTick <= 5,
    minutes_since_lifecycle_tick: Number.isFinite(minutesSinceTick)
      ? Math.round(minutesSinceTick * 10) / 10
      : null,
    pending_intents_over_24h: pendingIntentsRes.count ?? 0,
    webhook_failures_24h: webhookFailuresRes.count ?? 0,
    lifecycle,
  };

  const ok =
    checks.lifecycle_ok &&
    checks.pending_intents_over_24h === 0 &&
    checks.webhook_failures_24h === 0;

  logApiMetric("cron.health_check", { ok, durationMs: Date.now() - started, checks });

  return { ok, checks };
}
