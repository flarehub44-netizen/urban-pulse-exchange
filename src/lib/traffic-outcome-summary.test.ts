import { describe, expect, it } from "vitest";
import { formatTrafficOutcomeSummary, trafficOutcomeStatusBadge } from "./traffic-outcome-summary";

describe("formatTrafficOutcomeSummary", () => {
  it("formats settled with measured value", () => {
    const s = formatTrafficOutcomeSummary({
      status: "settled",
      target: 5200,
      comparisonOp: "gt",
      resolutionMetric: "flow",
      category: "Fluxo",
      rawValue: 5340,
      derivedSide: "YES",
      resolved: "YES",
    });
    expect(s).toContain("5.340");
    expect(s).toContain("SIM");
  });

  it("formats void", () => {
    const s = formatTrafficOutcomeSummary({
      status: "void",
      target: 0,
      comparisonOp: null,
      resolutionMetric: null,
      category: "Fluxo",
      rawValue: null,
      derivedSide: null,
      resolved: null,
    });
    expect(s).toContain("Cancelado");
  });

  it("badge for dispute", () => {
    expect(trafficOutcomeStatusBadge("dispute")).toBe("Em disputa");
  });
});
