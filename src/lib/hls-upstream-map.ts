/**
 * Server-only allowlist mapping camera slug → upstream HLS playlist URL.
 * Used by /api/public/hls-proxy/* to avoid open-proxy abuse.
 *
 * Each entry must include the headers required by the upstream CDN (Origin/Referer)
 * so CloudFront-style CORS-restricted streams accept the request.
 */
export type UpstreamCamera = {
  playlistUrl: string;
  /** Hostnames the proxy is allowed to fetch segments from for this camera. */
  allowedHosts: string[];
  /** Extra headers forwarded to upstream (Origin, Referer, User-Agent...). */
  headers: Record<string, string>;
};

export const HLS_UPSTREAM_MAP: Record<string, UpstreamCamera> = {
  "motiva-br116-km225": {
    playlistUrl:
      "https://d3b8201cy0qzzb.cloudfront.net/out/v1/4bd31ad7560846e08093f9552f92a8d0/CMAF_HLS/index_1.m3u8",
    allowedHosts: ["d3b8201cy0qzzb.cloudfront.net"],
    headers: {
      Origin: "https://rodovias.motiva.com.br",
      Referer: "https://rodovias.motiva.com.br/",
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
    },
  },
};

export function getUpstream(slug: string): UpstreamCamera | null {
  return HLS_UPSTREAM_MAP[slug] ?? null;
}
