import { describe, expect, it } from "vitest";
import { estimatePayout3, poolImbalanceWarning3, probability3 } from "./football-parimutuel";

describe("football-parimutuel", () => {
  it("probability3 sums roughly to 1", () => {
    const p = { HOME: 300, DRAW: 200, AWAY: 500 };
    const sum = probability3(p, "HOME") + probability3(p, "DRAW") + probability3(p, "AWAY");
    expect(sum).toBeCloseTo(1, 5);
  });

  it("estimatePayout3 increases with stake", () => {
    const pool = { HOME: 100, DRAW: 100, AWAY: 100 };
    const low = estimatePayout3(pool, "HOME", 50);
    const high = estimatePayout3(pool, "HOME", 200);
    expect(high).toBeGreaterThan(low);
  });

  it("poolImbalanceWarning3 warns on skew", () => {
    expect(poolImbalanceWarning3({ HOME: 950, DRAW: 30, AWAY: 20 })).toBeTruthy();
    expect(poolImbalanceWarning3({ HOME: 100, DRAW: 100, AWAY: 100 })).toBeNull();
  });
});
