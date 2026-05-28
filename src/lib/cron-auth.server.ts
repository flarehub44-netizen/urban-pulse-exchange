import { createClient } from "@supabase/supabase-js";

const MAX_CLOCK_SKEW_SECONDS = 300;

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function signHmacSha256(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getServiceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function assertNonceNotReplayed(nonce: string): Promise<boolean> {
  const service = getServiceClient();
  if (!service) return true;
  const { data, error } = await service.rpc("service_assert_rate_limit", {
    p_key: `cron-nonce:${nonce}`,
    p_max: 1,
    p_window_seconds: MAX_CLOCK_SKEW_SECONDS,
  });
  if (error) return false;
  return !Boolean((data as { limited?: boolean } | null)?.limited);
}

export async function assertCronAuth(request: Request): Promise<Response | null> {
  const hmacSecret = process.env.CRON_HMAC_SECRET;
  const legacySecret = process.env.CRON_SECRET;
  if (!hmacSecret && !legacySecret) {
    return new Response(JSON.stringify({ error: "CRON_SECRET not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (hmacSecret) {
    const timestamp = request.headers.get("x-cron-timestamp") ?? "";
    const nonce = request.headers.get("x-cron-nonce") ?? "";
    const signature = (request.headers.get("x-cron-signature") ?? "").toLowerCase();
    if (!timestamp || !nonce || !signature) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const ts = Number(timestamp);
    if (!Number.isFinite(ts)) {
      return new Response(JSON.stringify({ error: "invalid_timestamp" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSeconds - ts) > MAX_CLOCK_SKEW_SECONDS) {
      return new Response(JSON.stringify({ error: "stale_request" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!/^[a-zA-Z0-9_-]{8,128}$/.test(nonce)) {
      return new Response(JSON.stringify({ error: "invalid_nonce" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const base = `${request.method}\n${new URL(request.url).pathname}\n${timestamp}\n${nonce}`;
    const expected = await signHmacSha256(hmacSecret, base);
    if (!timingSafeEqual(expected, signature.replace("sha256=", ""))) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const nonceOk = await assertNonceNotReplayed(nonce);
    if (!nonceOk) {
      return new Response(JSON.stringify({ error: "replay_detected" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    return null;
  }

  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token !== legacySecret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}
