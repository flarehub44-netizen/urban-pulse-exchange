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

async function handleCryptoSlot(request: Request) {
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const limited = await assertRateLimit(`cron:crypto-slot:${ip}`, {
    max: 30,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const denied = await assertCronAuth(request);
  if (denied) return denied;

  const started = Date.now();
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase.rpc("cron_open_crypto_slot", {
      p_interval_minutes: 15,
    });
    if (error) {
      logApiMetric("cron.crypto_slot", { ok: false, durationMs: Date.now() - started, ip });
      return json({ ok: false, error: error.message }, 500);
    }
    logApiMetric("cron.crypto_slot", { ok: true, durationMs: Date.now() - started, ip });
    return json({ ok: true, ...((data as object) ?? {}) });
  } catch (e) {
    console.error("[CryptoSlot]", e);
    logApiMetric("cron.crypto_slot", { ok: false, durationMs: Date.now() - started, ip });
    return json({ error: e instanceof Error ? e.message : "crypto_slot_failed" }, 500);
  }
}

export const Route = createFileRoute("/api/public/cron/crypto-slot")({
  server: {
    handlers: {
      GET: ({ request }) => handleCryptoSlot(request),
      POST: ({ request }) => handleCryptoSlot(request),
    },
  },
});
