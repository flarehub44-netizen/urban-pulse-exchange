import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { validateWebhookSignature, type SyncPayWebhookPayload } from "@/lib/syncpay";
import { assertRateLimit } from "@/lib/rate-limit.server";

function getServiceClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/webhooks/syncpay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
        const limited = assertRateLimit(`syncpay:${ip}`, { max: 60, windowMs: 60_000 });
        if (limited) return limited;

        const rawBody = await request.text();
        const signature = request.headers.get("x-syncpay-signature") ?? "";
        const providerEventId =
          request.headers.get("x-syncpay-event-id") ?? request.headers.get("x-event-id") ?? null;

        const valid = await validateWebhookSignature(rawBody, signature);
        if (!valid) {
          console.error("[SyncPay Webhook] Invalid signature � rejected");
          return json({ error: "invalid_signature" }, 401);
        }

        let payload: SyncPayWebhookPayload;
        try {
          payload = JSON.parse(rawBody) as SyncPayWebhookPayload;
        } catch {
          return json({ error: "invalid_json" }, 400);
        }

        const { event, data } = payload;
        const supabase = getServiceClient();
        const { data: result, error: processErr } = await supabase.rpc(
          "service_process_syncpay_webhook",
          {
            p_provider_id: data.id,
            p_event: event,
            p_payload: payload as unknown as Record<string, unknown>,
            p_signature: signature,
            p_provider_event_id: providerEventId,
          },
        );

        if (processErr) {
          console.error("[SyncPay Webhook] process failed", {
            providerId: data.id,
            providerEventId,
            event,
            error: processErr.message,
          });
          return json({ error: "process_failed" }, 500);
        }

        console.info("[SyncPay Webhook] processed", {
          providerId: data.id,
          providerEventId,
          event,
          result,
        });
        return json(result ?? { ok: true });
      },
    },
  },
});
