import { createFileRoute } from "@tanstack/react-router";
import type { Json } from "@/integrations/supabase/types";
import { getServiceClient } from "@/lib/supabase-service.server";
import {
  getPixChargeStatus,
  getPixPayoutStatus,
  type PixChargeResponse,
  type PixPayoutResponse,
} from "@/lib/syncpay";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

type IntentRow = {
  id: string;
  provider_id: string | null;
  type: "deposit" | "withdraw";
  amount: number;
  created_at: string;
  provider_payload: Json | null;
};

function mapPayoutStatusToEvent(s: PixPayoutResponse["status"]): string | null {
  if (s === "COMPLETED") return "PAYOUT_COMPLETED";
  if (s === "FAILED") return "PAYOUT_FAILED";
  return null;
}

function mapChargeStatusToEvent(s: PixChargeResponse["status"]): string | null {
  if (s === "COMPLETED") return "PAYMENT_RECEIVED";
  if (s === "CANCELLED") return "PAYMENT_FAILED";
  if (s === "EXPIRED") return "PAYMENT_EXPIRED";
  return null;
}

export const Route = createFileRoute("/api/public/hooks/reconcile-syncpay-payouts")({
  server: {
    handlers: {
      POST: async () => {
        const supabase = getServiceClient();

        // Look at intents pending for more than 2 minutes — webhook usually arrives in seconds.
        const cutoff = new Date(Date.now() - 2 * 60_000).toISOString();
        const { data: intents, error } = await supabase
          .from("payment_intents")
          .select("id, provider_id, type, amount, created_at, provider_payload")
          .eq("status", "pending")
          .not("provider_id", "is", null)
          .lt("created_at", cutoff)
          .order("created_at", { ascending: true })
          .limit(50);

        if (error) {
          console.error("[reconcile-syncpay] query failed", error.message);
          return json({ error: "query_failed" }, 500);
        }

        const results: Array<{ intentId: string; action: string; status?: string }> = [];

        for (const intent of (intents ?? []) as IntentRow[]) {
          const providerId = intent.provider_id;
          if (!providerId) continue;
          try {
            if (intent.type === "withdraw") {
              const status = await getPixPayoutStatus(providerId);
              if (!status) {
                results.push({ intentId: intent.id, action: "not_found_at_provider" });
                continue;
              }
              const event = mapPayoutStatusToEvent(status.status);
              if (!event) {
                results.push({
                  intentId: intent.id,
                  action: "still_pending",
                  status: status.status,
                });
                continue;
              }
              const { error: rpcErr } = await supabase.rpc(
                "service_process_syncpay_webhook",
                {
                  p_provider_id: providerId,
                  p_event: event,
                  p_payload: {
                    event,
                    data: { id: providerId, status: status.status, amount: intent.amount },
                    source: "reconciliation",
                  } as unknown as Json,
                  p_signature: "reconciliation-cron",
                  p_provider_event_id: `recon:${providerId}:${event}`,
                },
              );
              if (rpcErr) {
                console.error("[reconcile-syncpay] rpc failed (withdraw)", {
                  intentId: intent.id,
                  err: rpcErr.message,
                });
                results.push({ intentId: intent.id, action: "rpc_failed" });
                continue;
              }
              results.push({ intentId: intent.id, action: `applied:${event}` });
            } else if (intent.type === "deposit") {
              const status = await getPixChargeStatus(providerId);
              if (!status) {
                results.push({ intentId: intent.id, action: "not_found_at_provider" });
                continue;
              }
              const event = mapChargeStatusToEvent(status.status);
              if (!event) {
                results.push({
                  intentId: intent.id,
                  action: "still_pending",
                  status: status.status,
                });
                continue;
              }
              // Deposits require payer document; without it the RPC blocks the credit.
              // We pass through whatever the provider returned in `raw`.
              const { error: rpcErr } = await supabase.rpc(
                "service_process_syncpay_webhook",
                {
                  p_provider_id: providerId,
                  p_event: event,
                  p_payload: {
                    event,
                    data: { id: providerId, status: status.status, amount: intent.amount },
                    provider_raw: status.raw,
                    source: "reconciliation",
                  } as unknown as Json,
                  p_signature: "reconciliation-cron",
                  p_provider_event_id: `recon:${providerId}:${event}`,
                },
              );
              if (rpcErr) {
                console.error("[reconcile-syncpay] rpc failed (deposit)", {
                  intentId: intent.id,
                  err: rpcErr.message,
                });
                results.push({ intentId: intent.id, action: "rpc_failed" });
                continue;
              }
              results.push({ intentId: intent.id, action: `applied:${event}` });
            }
          } catch (err) {
            console.error("[reconcile-syncpay] provider lookup failed", {
              intentId: intent.id,
              providerId,
              err: err instanceof Error ? err.message : String(err),
            });
            results.push({ intentId: intent.id, action: "provider_error" });
          }
        }

        return json({ scanned: intents?.length ?? 0, results });
      },
    },
  },
});
