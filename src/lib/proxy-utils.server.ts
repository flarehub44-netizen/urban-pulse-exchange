/** Shared hostname allowlist check for HLS and snapshot proxies. */
export function isAllowedUpstreamUrl(allowedHosts: string[], urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    return allowedHosts.includes(parsed.hostname);
  } catch {
    return false;
  }
}
