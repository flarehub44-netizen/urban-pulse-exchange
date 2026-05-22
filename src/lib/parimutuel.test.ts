import { describe, expect, it } from "vitest";
import {
  estimatePayout,
  isValidForSettlement,
  minorityPoolRatio,
  poolImbalanceWarning,
  probability,
  prizePool,
  validateMarketPools,
  MIN_MINORITY_RATIO,
  HOUSE_RETENTION,
  PRIZE_RATIO,
} from "@/lib/parimutuel";

describe("validateMarketPools", () => {
  it("settles balanced pool", () => {
    expect(validateMarketPools(70_000, 30_000, "YES")).toBe("settle");
  });

  it("settles one-sided winner on populated side", () => {
    expect(validateMarketPools(100_000, 0, "YES")).toBe("settle");
  });

  it("voids when winner has zero pool", () => {
    expect(validateMarketPools(100_000, 0, "NO")).toBe("void");
  });

  it("voids when minority below 5%", () => {
    expect(validateMarketPools(97_000, 3_000, "YES")).toBe("void");
  });

  it("settles when minority is exactly 5%", () => {
    // 5_000 / 100_000 = 5% — boundary is < 5%, so exactly 5% should settle
    expect(validateMarketPools(95_000, 5_000, "YES")).toBe("settle");
  });

  it("voids when minority is just below 5%", () => {
    // 4_999 / 99_999 ≈ 4.999% < 5%
    expect(validateMarketPools(95_000, 4_999, "YES")).toBe("void");
  });

  it("voids when both pools are zero", () => {
    expect(validateMarketPools(0, 0, "YES")).toBe("void");
    expect(validateMarketPools(0, 0, "NO")).toBe("void");
  });

  it("settles when winning side is NO and YES is minority above threshold", () => {
    expect(validateMarketPools(5_000, 95_000, "NO")).toBe("settle");
  });

  it("isValidForSettlement mirrors validateMarketPools", () => {
    expect(isValidForSettlement(70_000, 30_000, "YES")).toBe(true);
    expect(isValidForSettlement(97_000, 3_000, "YES")).toBe(false);
  });
});

describe("estimatePayout", () => {
  it("returns zero payout for zero stake", () => {
    const result = estimatePayout({ YES: 1_000, NO: 1_000 }, "YES", 0);
    expect(result.payout).toBe(0);
    expect(result.profit).toBe(0);
  });

  it("returns zero payout for negative stake", () => {
    const result = estimatePayout({ YES: 1_000, NO: 1_000 }, "YES", -50);
    expect(result.payout).toBe(0);
  });

  it("computes correct payout for balanced pool", () => {
    // pool YES=1000, NO=1000, stake YES=100
    // newYES=1100, share=100/1100≈0.0909, distributable=1000*0.9=900
    // payout = 100 + 0.0909*900 ≈ 181.82
    const result = estimatePayout({ YES: 1_000, NO: 1_000 }, "YES", 100);
    expect(result.payout).toBeGreaterThan(100);
    expect(result.profit).toBeGreaterThan(0);
    expect(result.roi).toBeGreaterThan(0);
    expect(result.share).toBeCloseTo(100 / 1_100);
  });

  it("payout is stake only when opposite pool is zero (no winnings to share)", () => {
    // Only YES side exists — winner gets back only their stake
    const result = estimatePayout({ YES: 1_000, NO: 0 }, "YES", 100);
    expect(result.payout).toBeCloseTo(100); // stake + 0 * share
    expect(result.profit).toBeCloseTo(0);
  });

  it("share is between 0 and 1", () => {
    const result = estimatePayout({ YES: 10_000, NO: 5_000 }, "YES", 500);
    expect(result.share).toBeGreaterThan(0);
    expect(result.share).toBeLessThan(1);
  });
});

describe("probability", () => {
  it("returns 0.5 when pool is empty", () => {
    expect(probability({ YES: 0, NO: 0 }, "YES")).toBe(0.5);
  });

  it("computes YES probability correctly", () => {
    expect(probability({ YES: 750, NO: 250 }, "YES")).toBeCloseTo(0.75);
  });

  it("computes NO probability correctly", () => {
    expect(probability({ YES: 750, NO: 250 }, "NO")).toBeCloseTo(0.25);
  });

  it("probabilities sum to 1", () => {
    const pool = { YES: 600, NO: 400 };
    expect(probability(pool, "YES") + probability(pool, "NO")).toBeCloseTo(1);
  });
});

describe("prizePool", () => {
  it("prize pool is 90% of total", () => {
    const pool = { YES: 500, NO: 500 };
    expect(prizePool(pool)).toBeCloseTo(900);
  });

  it("constants are correct", () => {
    expect(HOUSE_RETENTION).toBe(0.1);
    expect(PRIZE_RATIO).toBe(0.9);
    expect(MIN_MINORITY_RATIO).toBe(0.05);
  });
});

describe("minorityPoolRatio", () => {
  it("returns 0 for empty pools", () => {
    expect(minorityPoolRatio(0, 0)).toBe(0);
  });

  it("returns minority ratio correctly", () => {
    expect(minorityPoolRatio(90_000, 10_000)).toBeCloseTo(0.1);
  });

  it("returns 0.5 for balanced pool", () => {
    expect(minorityPoolRatio(500, 500)).toBeCloseTo(0.5);
  });
});

describe("poolImbalanceWarning", () => {
  it("returns null for balanced pool", () => {
    expect(poolImbalanceWarning(500, 500)).toBeNull();
  });

  it("returns null for empty pool", () => {
    expect(poolImbalanceWarning(0, 0)).toBeNull();
  });

  it("returns null when one side is zero (handled as void, not warning)", () => {
    expect(poolImbalanceWarning(1000, 0)).toBeNull();
  });

  it("returns warning string when minority is below threshold", () => {
    const warning = poolImbalanceWarning(97_000, 3_000);
    expect(warning).not.toBeNull();
    expect(warning).toContain("cancelado");
  });

  it("returns weaker warning when ratio is between 5% and 10%", () => {
    // 7% ratio — below 10% (MIN_MINORITY_RATIO * 2) but above 5%
    const warning = poolImbalanceWarning(93_000, 7_000);
    expect(warning).not.toBeNull();
    expect(warning).toContain("Pouca liquidez");
  });
});
