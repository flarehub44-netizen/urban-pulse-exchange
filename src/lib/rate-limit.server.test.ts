import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase-service.server", () => ({
  getServiceClient: vi.fn(),
}));

import { getServiceClient } from "@/lib/supabase-service.server";
import { assertRateLimit } from "@/lib/rate-limit.server";

describe("assertRateLimit", () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.mocked(getServiceClient).mockReset();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it("returns 503 in production when RPC fails", async () => {
    process.env.NODE_ENV = "production";
    vi.mocked(getServiceClient).mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "db down" } }),
    } as never);

    const res = await assertRateLimit("test:key", { max: 10, windowMs: 60_000 });
    expect(res?.status).toBe(503);
  });

  it("returns null in development when RPC fails", async () => {
    process.env.NODE_ENV = "development";
    vi.mocked(getServiceClient).mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "db down" } }),
    } as never);

    const res = await assertRateLimit("test:key", { max: 10, windowMs: 60_000 });
    expect(res).toBeNull();
  });

  it("returns 429 when limited", async () => {
    process.env.NODE_ENV = "production";
    vi.mocked(getServiceClient).mockReturnValue({
      rpc: vi.fn().mockResolvedValue({
        data: { limited: true, retry_after_seconds: 30 },
        error: null,
      }),
    } as never);

    const res = await assertRateLimit("test:key", { max: 1, windowMs: 60_000 });
    expect(res?.status).toBe(429);
  });
});
