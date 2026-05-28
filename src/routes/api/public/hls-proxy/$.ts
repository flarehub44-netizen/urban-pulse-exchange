import { createFileRoute } from "@tanstack/react-router";
import { getUpstream } from "@/lib/hls-upstream-map.server";
import { assertRateLimit } from "@/lib/rate-limit.server";
import { isAllowedUpstreamUrl } from "@/lib/proxy-utils.server";

const CORS_ORIGIN = process.env.PUBLIC_DOMAIN
  ? `https://${process.env.PUBLIC_DOMAIN}`
  : "*";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": CORS_ORIGIN,
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Range, Content-Type, Accept",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
  "Access-Control-Max-Age": "86400",
};

function b64urlEncode(s: string): string {
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): string {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  return atob(padded);
}


function rewritePlaylist(playlist: string, slug: string, playlistUrl: string): string {
  const base = new URL(playlistUrl);
  const proxyOrigin = `/api/public/hls-proxy/${slug}`;

  const toProxied = (uri: string, isPlaylist: boolean): string => {
    let absolute: string;
    try {
      absolute = new URL(uri, base).toString();
    } catch {
      return uri;
    }
    const encoded = b64urlEncode(absolute);
    return isPlaylist ? `${proxyOrigin}/sub?u=${encoded}` : `${proxyOrigin}/seg?u=${encoded}`;
  };

  const lines = playlist.split(/\r?\n/);
  const out: string[] = [];

  for (const line of lines) {
    if (line.length === 0) {
      out.push(line);
      continue;
    }
    if (line.startsWith("#")) {
      const rewritten = line.replace(/URI="([^"]+)"/g, (_m, uri: string) => {
        const isPlaylist = /\.m3u8(\?|$)/i.test(uri);
        return `URI="${toProxied(uri, isPlaylist)}"`;
      });
      out.push(rewritten);
    } else {
      const isPlaylist = /\.m3u8(\?|$)/i.test(line);
      out.push(toProxied(line, isPlaylist));
    }
  }

  return out.join("\n");
}

async function fetchPlaylist(
  slug: string,
  playlistUrl: string,
  headers: Record<string, string>,
): Promise<Response> {
  const upstream = await fetch(playlistUrl, { method: "GET", headers });
  if (!upstream.ok) {
    return new Response(`Upstream error: ${upstream.status}`, {
      status: 502,
      headers: CORS_HEADERS,
    });
  }
  const text = await upstream.text();
  const rewritten = rewritePlaylist(text, slug, playlistUrl);
  return new Response(rewritten, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/vnd.apple.mpegurl",
      "Cache-Control": "no-store, max-age=1",
    },
  });
}

async function fetchSegment(
  upstreamUrl: string,
  upstreamHeaders: Record<string, string>,
  request: Request,
): Promise<Response> {
  const range = request.headers.get("Range");
  const headers: Record<string, string> = { ...upstreamHeaders };
  if (range) headers["Range"] = range;

  const upstream = await fetch(upstreamUrl, { method: "GET", headers });
  if (!upstream.ok && upstream.status !== 206) {
    return new Response(`Upstream error: ${upstream.status}`, {
      status: 502,
      headers: CORS_HEADERS,
    });
  }

  const respHeaders = new Headers();
  for (const [k, v] of upstream.headers) {
    const lk = k.toLowerCase();
    if (
      lk === "content-type" ||
      lk === "content-length" ||
      lk === "content-range" ||
      lk === "accept-ranges" ||
      lk === "last-modified" ||
      lk === "etag"
    ) {
      respHeaders.set(k, v);
    }
  }
  for (const [k, v] of Object.entries(CORS_HEADERS)) respHeaders.set(k, v);
  respHeaders.set("Cache-Control", "public, max-age=60");

  return new Response(upstream.body, { status: upstream.status, headers: respHeaders });
}

export const Route = createFileRoute("/api/public/hls-proxy/$")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),

      GET: async ({ request, params }) => {
        const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
        const limited = await assertRateLimit(`hls-proxy:${ip}`, { max: 240, windowMs: 60_000 });
        if (limited) return limited;

        const splat = (params as { _splat?: string })._splat ?? "";
        const [slug, ...rest] = splat.split("/");
        const action = rest.join("/");

        if (!slug) {
          return new Response("Missing camera slug", { status: 400, headers: CORS_HEADERS });
        }

        const upstream = await getUpstream(slug);
        if (!upstream) {
          return new Response("Unknown camera", { status: 404, headers: CORS_HEADERS });
        }

        const url = new URL(request.url);

        // Root playlist: empty, or any *.m3u8 (index.m3u8, stream.m3u8, etc.)
        if (action === "" || /\.m3u8$/i.test(action)) {
          return fetchPlaylist(slug, upstream.playlistUrl, upstream.headers);
        }

        if (action === "sub") {
          const encoded = url.searchParams.get("u");
          if (!encoded) {
            return new Response("Missing u param", { status: 400, headers: CORS_HEADERS });
          }
          let target: string;
          try {
            target = b64urlDecode(encoded);
          } catch {
            return new Response("Bad u param", { status: 400, headers: CORS_HEADERS });
          }
          if (!isAllowedUpstreamUrl(upstream.allowedHosts, target)) {
            return new Response("Upstream not allowed", { status: 403, headers: CORS_HEADERS });
          }
          return fetchPlaylist(slug, target, upstream.headers);
        }

        if (action === "seg") {
          const encoded = url.searchParams.get("u");
          if (!encoded) {
            return new Response("Missing u param", { status: 400, headers: CORS_HEADERS });
          }
          let target: string;
          try {
            target = b64urlDecode(encoded);
          } catch {
            return new Response("Bad u param", { status: 400, headers: CORS_HEADERS });
          }
          if (!isAllowedUpstreamUrl(upstream.allowedHosts, target)) {
            return new Response("Upstream not allowed", { status: 403, headers: CORS_HEADERS });
          }
          return fetchSegment(target, upstream.headers, request);
        }

        return new Response("Not found", { status: 404, headers: CORS_HEADERS });
      },
    },
  },
});
