import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { runFootballResolve, runFootballSync } from "./lib/football-cron.server";
import { runImpactMonthlyFinalize, runImpactXpCredit } from "./lib/impact-cron.server";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

/** Allowed origins for <img> (avatars, football logos, community covers, CET snapshots). */
const CSP_IMG_SRC = [
  "'self'",
  "data:",
  "blob:",
  "https://storage.googleapis.com", // legacy / GCS assets
  "https://media.api-sports.io", // API-Football team logos
  "https://api.dicebear.com", // default avatars
  "https://*.supabase.co", // Supabase Storage (community covers, uploads)
  "https://cameras.cetsp.com.br", // CET-SP live snapshots
  "https://cetsp.com.br",
  "https://www.cetsp.com.br",
].join(" ");

// F07: per-request nonce for script-src.
// For HTML responses the function buffers the body and injects nonce="" into
// every <script> tag. Non-HTML responses (JSON, streams) skip buffering.
// style-src uses 'unsafe-inline' only — combining a nonce with 'unsafe-inline'
// in style-src causes browsers to silently ignore 'unsafe-inline' (CSP Level 3 spec),
// which blocks inline style="" attributes from @floating-ui/react-dom (Radix UI).
async function addSecurityHeaders(response: Response): Promise<Response> {
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const headers = new Headers(response.headers);
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      // 'strict-dynamic' propagates trust to scripts loaded by nonce'd scripts (dynamic imports).
      // 'self' is kept as fallback for browsers that don't support 'strict-dynamic'.
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
      `script-src-elem 'self' 'nonce-${nonce}' https://viax.lovable.app`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src https://fonts.gstatic.com",
      `img-src ${CSP_IMG_SRC}`,
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
    ].join("; "),
  );

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }

  // Buffer HTML, inject nonce into <script> tags (skips tags that already have one).
  // This covers TanStack Start's hydration inline scripts whose hash changes every request.
  const text = await response.text();
  const patched = text.replace(/<script(?![^>]*\bnonce\b)(\b[^>]*)>/gi, `<script$1 nonce="${nonce}">`);
  return new Response(patched, { status: response.status, statusText: response.statusText, headers });
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

type ScheduledContext = { waitUntil: (p: Promise<unknown>) => void };

/** Cloudflare/Lovable bindings arrive on `env`; copy string secrets into process.env for server code. */
function bindWorkerEnv(env: unknown): void {
  if (!env || typeof env !== "object") return;
  for (const [key, value] of Object.entries(env as Record<string, unknown>)) {
    if (typeof value === "string" && value.length > 0) {
      process.env[key] ??= value;
    }
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    bindWorkerEnv(env);
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response);
      return await addSecurityHeaders(normalized);
    } catch (error) {
      console.error(error);
      return await addSecurityHeaders(brandedErrorResponse());
    }
  },

  /**
   * Primary football cron executor (see docs/OPS_CRONS.md).
   * HTTP /api/cron/* is for manual runs with CRON_SECRET only.
   */
  scheduled(event: { cron?: string }, env: unknown, ctx: ScheduledContext) {
    bindWorkerEnv(env);
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.VIAX_SUPABASE_SERVICE_ROLE_KEY) return;
    const cron = event.cron ?? "";
    ctx.waitUntil(
      (async () => {
        try {
          if (cron === "*/30 * * * *") {
            await runFootballSync();
          } else if (cron === "*/5 * * * *") {
            await runFootballResolve();
          } else if (cron === "0 * * * *") {
            await runImpactXpCredit(50);
          } else if (cron === "15 3 1 * *") {
            await runImpactMonthlyFinalize();
          }
        } catch (e) {
          console.error("[ScheduledCron]", cron, e);
        }
      })(),
    );
  },
};
