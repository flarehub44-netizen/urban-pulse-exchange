import { describe, expect, it } from "vitest";
import { assertPublishableSupabaseKey } from "./supabase-key-guard";

/** Minimal JWT: header.payload.sig (payload base64url) */
function fakeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${header}.${body}.sig`;
}

describe("assertPublishableSupabaseKey", () => {
  it("allows anon role", () => {
    expect(() => assertPublishableSupabaseKey(fakeJwt({ role: "anon" }))).not.toThrow();
  });

  it("rejects service_role", () => {
    expect(() => assertPublishableSupabaseKey(fakeJwt({ role: "service_role" }))).toThrow(
      /service_role/,
    );
  });
});
