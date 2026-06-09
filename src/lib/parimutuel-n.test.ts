import { describe, expect, it } from "vitest";
import {
  estimatePayoutN,
  minorityPoolRatioN,
  poolTotalN,
  probabilityN,
} from "@/lib/parimutuel-n";

describe("parimutuel-n", () => {
  const outcomes = [
    { id: "a", pool: 100 },
    { id: "b", pool: 100 },
    { id: "c", pool: 100 },
  ];

  it("computes equal probabilities", () => {
    expect(probabilityN(outcomes, "a")).toBeCloseTo(1 / 3);
    expect(poolTotalN(outcomes)).toBe(300);
  });

  it("estimates payout for new stake", () => {
    const payout = estimatePayoutN(outcomes, "a", 50);
    expect(payout).toBeGreaterThan(50);
  });

  it("minority ratio for balanced pool", () => {
    expect(minorityPoolRatioN(outcomes)).toBeCloseTo(1 / 3);
  });
});
