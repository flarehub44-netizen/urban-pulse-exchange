import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { runFootballResolve, runFootballSync } from "./lib/football-cron.server";

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

function addSecurityHeaders(response: Response): Response {
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
      "script-src 'self' 'sha256-IlBMqZFDe0MAWOyRZASsffMFCeHUSc6O/6HYUq1e6uY='",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src https://fonts.gstatic.com",
      `img-src ${CSP_IMG_SRC}`,
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
    ].join("; "),
  );
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
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

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response);
      return addSecurityHeaders(normalized);
    } catch (error) {
      console.error(error);
      return addSecurityHeaders(brandedErrorResponse());
    }
  },

  /**
   * Primary football cron executor (see docs/OPS_CRONS.md).
   * HTTP /api/cron/* is for manual runs with CRON_SECRET only.
   */
  scheduled(event: { cron?: string }, _env: unknown, ctx: ScheduledContext) {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
    const cron = event.cron ?? "";
    ctx.waitUntil(
      (async () => {
        try {
          if (cron === "*/30 * * * *") {
            await runFootballSync();
          } else if (cron === "*/5 * * * *") {
            await runFootballResolve();
          }
        } catch (e) {
          console.error("[FootballCron]", cron, e);
        }
      })(),
    );
  },
};
