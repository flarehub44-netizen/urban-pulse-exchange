/** Guards against accidentally wiring service_role into the browser bundle. */

function decodeJwtPayload(token: string): { role?: string } | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    const raw =
      typeof globalThis.atob === "function"
        ? globalThis.atob(b64 + pad)
        : Buffer.from(b64 + pad, "base64").toString("utf8");
    return JSON.parse(raw) as { role?: string };
  } catch {
    return null;
  }
}

export function assertPublishableSupabaseKey(key: string): void {
  const payload = decodeJwtPayload(key);
  if (payload?.role === "service_role") {
    throw new Error(
      "Invalid Supabase publishable key: JWT role is service_role. " +
        "Use the anon/publishable key from Supabase Dashboard → Project Settings → API. " +
        "Never set SUPABASE_SERVICE_ROLE_KEY as VITE_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
}
