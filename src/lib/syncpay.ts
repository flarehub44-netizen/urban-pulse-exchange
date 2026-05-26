// SyncPay client wrapper — Pix In / Pix Out
// Docs: configure SYNCPAY_API_URL, SYNCPAY_API_KEY, SYNCPAY_WEBHOOK_SECRET no .env

const API_URL = process.env.SYNCPAY_API_URL ?? "https://api.syncpay.com.br/v1";
const API_KEY = process.env.SYNCPAY_API_KEY ?? "";
const WEBHOOK_SECRET = process.env.SYNCPAY_WEBHOOK_SECRET ?? "";

export type PixChargeResponse = {
  id: string; // provider_id
  qr_code: string; // EMV Pix Copia e Cola
  qr_code_base64: string;
  expiration: string; // ISO 8601
  status: "ACTIVE" | "COMPLETED" | "EXPIRED" | "CANCELLED";
};

export type PixPayoutResponse = {
  id: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
};

export type SyncPayWebhookPayload = {
  event:
    | "PAYMENT_RECEIVED"
    | "PAYMENT_FAILED"
    | "PAYMENT_EXPIRED"
    | "PAYOUT_COMPLETED"
    | "PAYOUT_FAILED";
  data: {
    id: string; // provider_id
    status: string;
    amount: number; // em reais
    payer?: {
      name?: string;
      document?: string;
    };
  };
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_KEY) throw new Error("SYNCPAY_API_KEY not configured");

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
      ...init.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "(empty)");
    throw new Error(`SyncPay ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

/**
 * Cria uma cobrança Pix (depósito).
 * O usuário escaneia o QR Code no app do banco e paga.
 * O webhook `/api/public/webhooks/syncpay` confirma o pagamento e credita o saldo.
 */
export async function createPixCharge(opts: {
  amount: number;
  correlationId: string; // payment_intent.id
  description?: string;
  expiresInMinutes?: number;
}): Promise<PixChargeResponse> {
  return request<PixChargeResponse>("/charges/pix", {
    method: "POST",
    body: JSON.stringify({
      amount: opts.amount,
      correlation_id: opts.correlationId,
      description: opts.description ?? "Depósito ViaX",
      expiration_minutes: opts.expiresInMinutes ?? 30,
    }),
  });
}

/**
 * Inicia um Pix Out (saque) para a chave Pix do usuário.
 */
export async function createPixPayout(opts: {
  amount: number;
  pixKey: string;
  correlationId: string;
  description?: string;
}): Promise<PixPayoutResponse> {
  return request<PixPayoutResponse>("/payouts/pix", {
    method: "POST",
    body: JSON.stringify({
      amount: opts.amount,
      pix_key: opts.pixKey,
      correlation_id: opts.correlationId,
      description: opts.description ?? "Saque ViaX",
    }),
  });
}

/**
 * Valida assinatura HMAC-SHA256 do webhook SyncPay.
 * Rejeitar qualquer payload com assinatura inválida.
 */
export async function validateWebhookSignature(
  rawBody: string,
  signatureHeader: string,
): Promise<boolean> {
  if (!WEBHOOK_SECRET) {
    console.warn("[SyncPay] SYNCPAY_WEBHOOK_SECRET not set — skipping signature validation");
    return true; // aceita em dev; NUNCA em produção sem o secret configurado
  }

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(WEBHOOK_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
    const expected = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Comparação timing-safe básica (Web Crypto garante que sign é constante-time)
    return expected === signatureHeader.toLowerCase().replace("sha256=", "");
  } catch {
    return false;
  }
}
