import { describe, expect, it } from "vitest";
import { copy } from "@/copy/pt-BR";

describe("copy.impact", () => {
  it("exposes program and top3 strings", () => {
    expect(copy.impact.programTitle.length).toBeGreaterThan(0);
    expect(copy.impact.howItWorksSteps.length).toBeGreaterThanOrEqual(3);
    expect(copy.impact.prizeTier1).toContain("1º");
    expect(copy.impact.exclusivePrizeDisclaimer).toMatch(/não representam saldo/i);
  });

  it("formats dynamic helpers", () => {
    expect(copy.impact.myXpMonth(1200)).toContain("1200");
    expect(copy.impact.eventCreditedToast(80)).toContain("80");
  });
});
