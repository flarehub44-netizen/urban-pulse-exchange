import { describe, expect, it } from "vitest";
import { clampRoi, computeLeagueScore, formatLeagueInviteUrl } from "@/lib/league-score";

describe("league-score", () => {
  it("clamps roi to [-1, 2]", () => {
    expect(clampRoi(-5)).toBe(-1);
    expect(clampRoi(10)).toBe(2);
    expect(clampRoi(0.5)).toBe(0.5);
  });

  it("computes higher score for better roi and accuracy", () => {
    const low = computeLeagueScore(-0.5, 100, 0.3, 1000);
    const high = computeLeagueScore(1, 500, 0.8, 1000);
    expect(high).toBeGreaterThan(low);
  });

  it("builds invite url", () => {
    expect(formatLeagueInviteUrl("ABCD1234")).toBe("https://viax.life/leagues/join/ABCD1234");
  });
});
