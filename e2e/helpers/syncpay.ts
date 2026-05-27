import { createHmac } from "node:crypto";

export function hasSyncPayWebhookSecret() {
  return !!process.env.SYNCPAY_WEBHOOK_SECRET;
}

export function hasSyncPayApiKey() {
  return !!process.env.SYNCPAY_API_KEY;
}

export function hasSyncPayStaging() {
  return hasSyncPayWebhookSecret() && hasSyncPayApiKey();
}

export function signSyncPayWebhook(rawBody: string, secret = process.env.SYNCPAY_WEBHOOK_SECRET!) {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

export function buildPaymentReceivedPayload(opts: { providerId: string; amount: number }) {
  return {
    event: "PAYMENT_RECEIVED" as const,
    data: {
      id: opts.providerId,
      status: "COMPLETED",
      amount: opts.amount,
    },
  };
}

export function buildPayoutCompletedPayload(opts: {
  providerId: string;
  amount: number;
  correlationId?: string;
}) {
  return {
    event: "PAYOUT_COMPLETED" as const,
    data: {
      id: opts.providerId,
      status: "COMPLETED",
      amount: opts.amount,
      correlation_id: opts.correlationId,
    },
  };
}

export function buildPayoutFailedPayload(opts: {
  providerId: string;
  amount: number;
  correlationId?: string;
}) {
  return {
    event: "PAYOUT_FAILED" as const,
    data: {
      id: opts.providerId,
      status: "FAILED",
      amount: opts.amount,
      correlation_id: opts.correlationId,
    },
  };
}
