import { afterEach, describe, expect, it } from "vitest";
import { assertCronAuth } from "./cron-auth.server";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("assertCronAuth", () => {
  it("returns 500 when no cron secret is configured", async () => {
    delete process.env.CRON_SECRET;
    delete process.env.CRON_HMAC_SECRET;
    const req = new Request("https://example.com/api/public/cron/football-sync");
    const res = await assertCronAuth(req);
    expect(res?.status).toBe(500);
  });

  it("accepts legacy bearer token when only CRON_SECRET is configured", async () => {
    process.env.CRON_SECRET = "legacy-secret";
    delete process.env.CRON_HMAC_SECRET;
    const req = new Request("https://example.com/api/public/cron/football-sync", {
      headers: { authorization: "Bearer legacy-secret" },
    });
    const res = await assertCronAuth(req);
    expect(res).toBeNull();
  });

  it("rejects missing hmac headers when CRON_HMAC_SECRET is configured", async () => {
    process.env.CRON_HMAC_SECRET = "hmac-secret";
    process.env.CRON_SECRET = "legacy-secret";
    const req = new Request("https://example.com/api/public/cron/football-sync");
    const res = await assertCronAuth(req);
    expect(res?.status).toBe(401);
  });
});
