/**
 * Server-only loader for camera HLS upstreams. Reads from `camera_upstreams`
 * table (via service role) instead of an in-code allowlist, so admins can
 * register new cameras at runtime.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type UpstreamCamera = {
  playlistUrl: string;
  allowedHosts: string[];
  headers: Record<string, string>;
};

type CacheEntry = { value: UpstreamCamera | null; expiresAt: number };
const cache = new Map<string, CacheEntry>();
const TTL_MS = 60_000;

export async function getUpstream(slug: string): Promise<UpstreamCamera | null> {
  const hit = cache.get(slug);
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  const { data, error } = await supabaseAdmin
    .from("camera_upstreams" as never)
    .select("slug, kind, upstream_url, allowed_hosts, headers")
    .eq("slug", slug)
    .eq("kind", "hls")
    .maybeSingle();

  if (error) {
    console.error("[hls-upstream] db error", error);
    return null;
  }
  if (!data) {
    cache.set(slug, { value: null, expiresAt: Date.now() + TTL_MS });
    return null;
  }

  const row = data as unknown as {
    upstream_url: string;
    allowed_hosts: string[];
    headers: Record<string, string> | null;
  };
  const value: UpstreamCamera = {
    playlistUrl: row.upstream_url,
    allowedHosts: row.allowed_hosts ?? [],
    headers: row.headers ?? {},
  };
  cache.set(slug, { value, expiresAt: Date.now() + TTL_MS });
  return value;
}
