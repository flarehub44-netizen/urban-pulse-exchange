import { describe, expect, it } from "vitest";
import {
  buildCommunityEndsAtIso,
  communityEndsAtMs,
  validateCommunityEndsAt,
} from "@/lib/community-market";

describe("buildCommunityEndsAtIso", () => {
  it("builds Brasília offset timestamp", () => {
    expect(buildCommunityEndsAtIso("2026-07-20", "18:00")).toBe("2026-07-20T18:00:00-03:00");
  });

  it("parses to expected UTC instant", () => {
    const ms = communityEndsAtMs("2026-07-20", "18:00");
    expect(new Date(ms).toISOString()).toBe("2026-07-20T21:00:00.000Z");
  });
});

describe("validateCommunityEndsAt", () => {
  it("rejects ends within 1 hour", () => {
    const now = Date.parse("2026-07-20T14:00:00.000Z");
    expect(validateCommunityEndsAt("2026-07-20", "11:30", now)).toBe("too_soon");
  });

  it("accepts ends more than 1 hour ahead", () => {
    const now = Date.parse("2026-07-20T14:00:00.000Z");
    expect(validateCommunityEndsAt("2026-07-20", "18:00", now)).toBeNull();
  });
});
