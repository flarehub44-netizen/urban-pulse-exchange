import { describe, expect, it } from "vitest";
import { computeSeasonFromBaseDate, resolveSyncBaseDate } from "./football-cron.server";

describe("football cron base-date helpers", () => {
  it("uses configured date when valid", () => {
    const resolved = resolveSyncBaseDate("2026-05-27", new Date("2028-01-01T00:00:00.000Z"));
    expect(resolved.toISOString().slice(0, 10)).toBe("2026-05-27");
    expect(computeSeasonFromBaseDate(resolved)).toBe(2026);
  });

  it("falls back to current date when config is invalid", () => {
    const now = new Date("2027-12-10T00:00:00.000Z");
    const resolved = resolveSyncBaseDate("invalid", now);
    expect(resolved).toBe(now);
    expect(computeSeasonFromBaseDate(resolved)).toBe(2027);
  });
});
