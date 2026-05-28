import { describe, expect, it } from "vitest";
import { computeImpactXpAwarded } from "@/lib/impact-xp-formula";

describe("computeImpactXpAwarded", () => {
  it("returns 0 below minimum volume or bettors", () => {
    expect(
      computeImpactXpAwarded({
        volumeValid: 1000,
        uniqueBettors: 20,
        slaOk: true,
        hasReviewedReport: false,
      }),
    ).toBe(0);
    expect(
      computeImpactXpAwarded({
        volumeValid: 2000,
        uniqueBettors: 8,
        slaOk: true,
        hasReviewedReport: false,
      }),
    ).toBe(0);
  });

  it("applies bonuses and cap", () => {
    const xp = computeImpactXpAwarded({
      volumeValid: 10000,
      uniqueBettors: 35,
      slaOk: true,
      hasReviewedReport: false,
    });
    expect(xp).toBeGreaterThan(0);
    expect(xp).toBeLessThanOrEqual(2500);
  });

  it("halves XP when reviewed report flag is set", () => {
    const base = computeImpactXpAwarded({
      volumeValid: 5000,
      uniqueBettors: 20,
      slaOk: true,
      hasReviewedReport: false,
    });
    const penalized = computeImpactXpAwarded({
      volumeValid: 5000,
      uniqueBettors: 20,
      slaOk: true,
      hasReviewedReport: true,
    });
    expect(penalized).toBe(Math.min(2500, Math.round(base * 0.5)));
  });
});
