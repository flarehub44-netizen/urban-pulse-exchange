// SyncPay client wrapper — Pix In / Pix Out
// Docs: configure SYNCPAY_CLIENT_ID, SYNCPAY_CLIENT_SECRET, SYNCPAY_WEBHOOK_SECRET no Wrangler.
// SYNCPAY_API_KEY (legacy static token) still accepted as fallback.

const API_URL = process.env.SYNCPAY_API_URL ?? "https://api.syncpay.com.br";
const CLIENT_ID = process.env.SYNCPAY_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.SYNCPAY_CLIENT_SECRET ?? "";
const LEGACY_API_KEY = process.env.SYNCPAY_API_KEY ?? "";
const WEBHOOK_SECRET = process.env.SYNCPAY_WEBHOOK_SECRET ?? "";
const CASHIN_PATH = process.env.SYNCPAY_CASHIN_PATH ?? "/api/partner/v1/cash-in";
const CASHOUT_PATH = process.env.SYNCPAY_CASHOUT_PATH ?? "/api/partner/v1/cash-out";
const CASHOUT_STATUS_PATH =
  process.env.SYNCPAY_CASHOUT_STATUS_PATH ?? "/api/partner/v1/cash-out/{id}";
const CASHIN_STATUS_PATH =
  process.env.SYNCPAY_CASHIN_STATUS_PATH ?? "/api/partner/v1/cash-in/{id}";
const WEBHOOK_URL = process.env.SYNCPAY_WEBHOOK_URL ?? "";
const AUTH_TOKEN_PATH = "/api/partner/v1/auth-token";
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 2;
const ERROR_BODY_SNIPPET_MAX = 240;
const TOKEN_SAFETY_MARGIN_MS = 60_000;

let _cachedToken: { token: string; expiresAt: number } | null = null;

async function getAuthToken(): Promise<string> {
  if (!CLIENT_SECRET) {
    if (LEGACY_API_KEY) {
      console.warn("[SyncPay] usando SYNCPAY_API_KEY legado — migre para SYNCPAY_CLIENT_ID + SYNCPAY_CLIENT_SECRET");
      return LEGACY_API_KEY;
    }
    throw new Error("SyncPay: configure SYNCPAY_CLIENT_ID + SYNCPAY_CLIENT_SECRET (ou SYNCPAY_API_KEY legado)");
  }

  const now = Date.now();
  if (_cachedToken && _cachedToken.expiresAt - TOKEN_SAFETY_MARGIN_MS > now) {
    return _cachedToken.token;
  }

  const baseUrl = normalizeApiUrl(API_URL);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}${AUTH_TOKEN_PATH}`, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "(empty)");
      const snippet = compactText(body);
      const looksLikeHtml = res.headers.get("content-type")?.includes("text/html") || body.includes("<!DOCTYPE");
      const msg = looksLikeHtml
        ? `syncpay_auth_html_error: token endpoint retornou HTML (${res.status}) — verifique SYNCPAY_CLIENT_ID e SYNCPAY_CLIENT_SECRET`
        : `SyncPay auth token failed ${res.status}: ${snippet}`;
      throw new Error(msg);
    }
    const json = (await res.json()) as { access_token: string; expires_in?: number };
    const expiresInMs = (json.expires_in ?? 3600) * 1000;
    _cachedToken = { token: json.access_token, expiresAt: now + expiresInMs };
    console.info("[SyncPay] token refreshed", { expiresInSeconds: json.expires_in ?? 3600 });
    return json.access_token;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeApiUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function sanitizeApiUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}`;
  } catch {
    return "(invalid SYNCPAY_API_URL)";
  }
}

function getContentType(res: Response): string {
  return res.headers.get("content-type")?.toLowerCase() ?? "";
}

function compactText(input: string): string {
  return input.replace(/\s+/g, " ").trim().slice(0, ERROR_BODY_SNIPPET_MAX);
}

function getRequestHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "(invalid-host)";
  }
}

export class SyncPayHttpError extends Error {
  constructor(
    message: string,
    public status: number,
    public contentType: string,
    public responseSnippet: string,
    public requestUrl: string,
  ) {
    super(message);
    this.name = "SyncPayHttpError";
  }
}

export type PixChargeResponse = {
  id: string; // provider_id / identifier
  qr_code: string; // EMV Pix Copia e Cola
  qr_code_base64?: string;
  expiration: string; // ISO 8601
  status: "ACTIVE" | "PENDING" | "COMPLETED" | "EXPIRED" | "CANCELLED";
};

export type PixPayoutResponse = {
  id: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "SUBMITTED";
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
    /** Cash-in Pix: documento do pagador (CPF/CNPJ) */
    debtor_account?: {
      name?: string;
      document?: string;
    };
  };
};

type SyncPayCashInRaw = {
  identifier?: string;
  pix_code?: string;
  qr_code?: string;
  qr_code_base64?: string;
  expiration?: string;
  status?: string;
};

type SyncPayCashOutRaw = {
  reference_id?: string;
  id?: string;
  status?: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAuthToken();
  const baseUrl = normalizeApiUrl(API_URL);
  const sanitizedBaseUrl = sanitizeApiUrl(baseUrl);
  const requestUrl = `${baseUrl}${path}`;
  const requestHost = getRequestHost(requestUrl);

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
    try {
      const startedAt = Date.now();
      const res = await fetch(requestUrl, {
        ...init,
        signal: ctrl.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...init.headers,
        },
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "(empty)");
        const contentType = getContentType(res);
        const snippet = compactText(body);
        const looksLikeCloudflare1016 =
          res.status === 530 &&
          (snippet.includes("1016") || snippet.toLowerCase().includes("origin dns error"));
        const message = looksLikeCloudflare1016
          ? `syncpay_dns_error: Workers não resolve ${requestHost} — verifique SYNCPAY_API_URL no Wrangler`
          : `SyncPay ${res.status}: ${snippet}`;
        const err = new SyncPayHttpError(message, res.status, contentType, snippet, requestUrl);
        console.error("[SyncPay] request failed", {
          apiBaseUrl: sanitizedBaseUrl,
          requestHost,
          path,
          method: init.method ?? "GET",
          status: res.status,
          contentType: contentType || "(missing)",
          bodySnippet: snippet,
          looksLikeCloudflare1016,
          attempt,
        });
        const retryable = res.status >= 500 || res.status === 429;
        if (!retryable || attempt === MAX_RETRIES) {
          throw err;
        }
        lastError = err;
        const backoffMs = 250 * 2 ** attempt;
        console.warn("[SyncPay] retrying request", {
          path,
          attempt,
          backoffMs,
          status: res.status,
        });
        await sleep(backoffMs);
        continue;
      }

      const durationMs = Date.now() - startedAt;
      console.info("[SyncPay] request ok", {
        apiBaseUrl: sanitizedBaseUrl,
        requestHost,
        path,
        method: init.method ?? "GET",
        durationMs,
        attempt,
      });
      return res.json() as Promise<T>;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown SyncPay request error");
      const retryable = lastError.name === "AbortError";
      if (!retryable || attempt === MAX_RETRIES) {
        throw lastError;
      }
      const backoffMs = 250 * 2 ** attempt;
      console.warn("[SyncPay] timeout/network retry", { path, attempt, backoffMs });
      await sleep(backoffMs);
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError ?? new Error("SyncPay request failed");
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
  client?: {
    name: string;
    cpf: string;
    email?: string;
    phone?: string;
  };
}): Promise<PixChargeResponse> {
  const raw = await request<SyncPayCashInRaw>(CASHIN_PATH, {
    method: "POST",
    body: JSON.stringify({
      amount: opts.amount,
      description: opts.description ?? "Depósito ViaX",
      metadata: { correlation_id: opts.correlationId },
      webhook_url: WEBHOOK_URL || undefined,
      expires_in_minutes: opts.expiresInMinutes ?? 30,
      client: opts.client,
    }),
  });
  return {
    id: raw.identifier ?? opts.correlationId,
    qr_code: raw.pix_code ?? raw.qr_code ?? "",
    qr_code_base64: raw.qr_code_base64,
    expiration: raw.expiration ?? new Date(Date.now() + 30 * 60_000).toISOString(),
    status: (raw.status?.toUpperCase() as PixChargeResponse["status"]) ?? "PENDING",
  };
}

/**
 * Inicia um Pix Out (saque) para a chave Pix do usuário.
 */
export async function createPixPayout(opts: {
  amount: number;
  pixKey: string;
  correlationId: string;
  description?: string;
  document?: string;
  beneficiaryName?: string;
}): Promise<PixPayoutResponse> {
  const isCpf = /^\d{11}$/.test(opts.pixKey.replace(/\D/g, ""));
  const body: Record<string, unknown> = {
    amount: opts.amount,
    description: opts.description ?? "Saque ViaX",
    pix_key_type: isCpf ? "CPF" : "EVP",
    pix_key: opts.pixKey,
    metadata: { correlation_id: opts.correlationId },
  };
  if (opts.document) {
    const digits = opts.document.replace(/\D/g, "");
    body.document = {
      type: digits.length > 11 ? "cnpj" : "cpf",
      number: digits,
    };
  }
  if (opts.beneficiaryName) body.beneficiary_name = opts.beneficiaryName;

  const raw = await request<SyncPayCashOutRaw>(CASHOUT_PATH, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return {
    id: raw.reference_id ?? raw.id ?? opts.correlationId,
    status: (raw.status?.toUpperCase() as PixPayoutResponse["status"]) ?? "SUBMITTED",
  };
}

/**
 * Consulta status de um Pix Out (saque) já submetido.
 * Retorna `null` se o provider responder 404.
 */
export async function getPixPayoutStatus(
  providerId: string,
): Promise<{ id: string; status: PixPayoutResponse["status"]; raw: unknown } | null> {
  const path = CASHOUT_STATUS_PATH.replace("{id}", encodeURIComponent(providerId));
  try {
    const raw = await request<SyncPayCashOutRaw & Record<string, unknown>>(path, {
      method: "GET",
    });
    return {
      id: (raw.reference_id ?? raw.id ?? providerId) as string,
      status: (raw.status?.toUpperCase() as PixPayoutResponse["status"]) ?? "PENDING",
      raw,
    };
  } catch (err) {
    if (err instanceof SyncPayHttpError && err.status === 404) return null;
    throw err;
  }
}

/**
 * Consulta status de uma cobrança Pix In já submetida.
 */
export async function getPixChargeStatus(
  providerId: string,
): Promise<{ id: string; status: PixChargeResponse["status"]; raw: unknown } | null> {
  const path = CASHIN_STATUS_PATH.replace("{id}", encodeURIComponent(providerId));
  try {
    const raw = await request<SyncPayCashInRaw & Record<string, unknown>>(path, {
      method: "GET",
    });
    return {
      id: (raw.identifier ?? providerId) as string,
      status: (raw.status?.toUpperCase() as PixChargeResponse["status"]) ?? "PENDING",
      raw,
    };
  } catch (err) {
    if (err instanceof SyncPayHttpError && err.status === 404) return null;
    throw err;
  }
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
    console.error("[SyncPay] SYNCPAY_WEBHOOK_SECRET não configurado — rejeitando webhook");
    return false;
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

    // XOR byte-a-byte para evitar timing attack via early-exit da comparação de string
    const incoming = signatureHeader.toLowerCase().replace("sha256=", "");
    if (incoming.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) {
      diff |= expected.charCodeAt(i) ^ incoming.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}
