import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { validateWebhookSignature, type SyncPayWebhookPayload } from "@/lib/syncpay";

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

export const Route = createFileRoute("/api/webhooks/syncpay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const signature = request.headers.get("x-syncpay-signature") ?? "";

        // 1. Validar assinatura HMAC — rejeitar qualquer payload não autenticado
        const valid = await validateWebhookSignature(rawBody, signature);
        if (!valid) {
          console.error("[SyncPay Webhook] Invalid signature — rejected");
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

        // 2. Buscar o payment_intent pelo provider_id do SyncPay
        const { data: intent } = await supabase
          .from("payment_intents")
          .select("id, user_id, type, amount, status")
          .eq("provider_id", data.id)
          .single();

        if (!intent) {
          // Idempotência: SyncPay re-envia eventos — logar e retornar 200
          console.warn("[SyncPay Webhook] Unknown provider_id:", data.id);
          return json({ ok: true, ignored: true });
        }

        // 3. Idempotência: ignorar se já processado
        if (intent.status !== "pending") {
          return json({ ok: true, already_processed: true });
        }

        // 4. Depósito confirmado → creditar saldo
        if (event === "PAYMENT_RECEIVED" && intent.type === "deposit") {
          const { error: creditErr } = await supabase.rpc("service_credit_balance", {
            p_user_id: intent.user_id,
            p_amount: intent.amount,
            p_intent_id: intent.id,
          });

          if (creditErr) {
            console.error("[SyncPay Webhook] Credit failed:", creditErr.message);
            return json({ error: "credit_failed" }, 500);
          }

          await supabase
            .from("payment_intents")
            .update({ status: "paid", settled_at: new Date().toISOString() })
            .eq("id", intent.id);

          return json({ ok: true });
        }

        // 5. Saque confirmado pelo banco → marcar como pago
        if (event === "PAYOUT_COMPLETED" && intent.type === "withdraw") {
          await supabase
            .from("payment_intents")
            .update({ status: "paid", settled_at: new Date().toISOString() })
            .eq("id", intent.id);
          return json({ ok: true });
        }

        // 6. Falha ou expiração → estornar saldo se era saque
        if (["PAYMENT_FAILED", "PAYMENT_EXPIRED", "PAYOUT_FAILED"].includes(event)) {
          const newStatus = event.includes("EXPIRED") ? "expired" : "failed";

          if (intent.type === "withdraw") {
            await supabase.rpc("service_refund_withdrawal", {
              p_user_id: intent.user_id,
              p_amount: intent.amount,
              p_intent_id: intent.id,
            });
          }

          await supabase.from("payment_intents").update({ status: newStatus }).eq("id", intent.id);

          return json({ ok: true });
        }

        return json({ ok: true, event_ignored: event });
      },
    },
  },
});
