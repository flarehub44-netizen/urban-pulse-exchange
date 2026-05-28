import { createFileRoute } from "@tanstack/react-router";
import { getSnapshotUpstream } from "@/lib/snapshot-upstream-map.server";
import { assertRateLimit } from "@/lib/rate-limit.server";
import { isAllowedUpstreamUrl } from "@/lib/proxy-utils.server";

const CORS_ORIGIN = process.env.PUBLIC_DOMAIN
  ? `https://${process.env.PUBLIC_DOMAIN}`
  : "*";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": CORS_ORIGIN,
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
  "Access-Control-Max-Age": "86400",
};

export const Route = createFileRoute("/api/public/snapshot-proxy/$")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async ({ request, params }) => {
        const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
        const limited = await assertRateLimit(`snapshot-proxy:${ip}`, { max: 120, windowMs: 60_000 });
        if (limited) return limited;

        const splat = (params as { _splat?: string })._splat ?? "";
        const [slug] = splat.split("/");
        if (!slug) {
          return new Response("Missing camera slug", {
            status: 400,
            headers: CORS_HEADERS,
          });
        }
        const upstream = await getSnapshotUpstream(slug);
        if (!upstream) {
          return new Response("Unknown camera", {
            status: 404,
            headers: CORS_HEADERS,
          });
        }

        if (!isAllowedUpstreamUrl(upstream.allowedHosts, upstream.imageUrl)) {
          return new Response("Upstream not allowed", { status: 403, headers: CORS_HEADERS });
        }

        const url = `${upstream.imageUrl}${
          upstream.imageUrl.includes("?") ? "&" : "?"
        }t=${Date.now()}`;

        try {
          const upstreamRes = await fetch(url, {
            method: "GET",
            headers: upstream.headers,
          });
          if (!upstreamRes.ok || !upstreamRes.body) {
            return new Response(`Upstream error: ${upstreamRes.status}`, {
              status: 502,
              headers: CORS_HEADERS,
            });
          }
          const contentType = upstreamRes.headers.get("content-type") ?? "image/jpeg";
          return new Response(upstreamRes.body, {
            status: 200,
            headers: {
              ...CORS_HEADERS,
              "Content-Type": contentType,
              "Cache-Control": "no-store, max-age=0",
            },
          });
        } catch (err) {
          console.error("snapshot-proxy fetch failed", err);
          return new Response("Upstream fetch failed", {
            status: 502,
            headers: CORS_HEADERS,
          });
        }
      },
    },
  },
});
