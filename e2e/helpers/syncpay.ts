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

export function buildPaymentReceivedPayload(opts: {
  providerId: string;
  amount: number;
}) {
  return {
    event: "PAYMENT_RECEIVED" as const,
    data: {
      id: opts.providerId,
      status: "COMPLETED",
      amount: opts.amount,
    },
  };
}
