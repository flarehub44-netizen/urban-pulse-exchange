/**
 * Server-only allowlist mapping camera slug → upstream JPEG snapshot URL.
 * Used by /api/public/snapshot-proxy/* to avoid open-proxy abuse and to
 * forward the Referer/Origin some camera CDNs require (e.g. CET-SP).
 */
export type UpstreamSnapshot = {
  imageUrl: string;
  allowedHosts: string[];
  headers: Record<string, string>;
};

export const SNAPSHOT_UPSTREAM_MAP: Record<string, UpstreamSnapshot> = {
  "cetsp-paulista": {
    imageUrl: "https://cameras.cetsp.com.br/Cams/23/2.jpg",
    allowedHosts: ["cameras.cetsp.com.br"],
    headers: {
      Referer: "https://cameras.cetsp.com.br/",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    },
  },
};

export function getSnapshotUpstream(slug: string): UpstreamSnapshot | null {
  return SNAPSHOT_UPSTREAM_MAP[slug] ?? null;
}
