import { describe, it, expect } from "vitest";
import { filterCatalogMarkets, isCatalogMarket, matchesStatusFilter } from "./markets-catalog";
import type { Market } from "@/store/viax-store";

const base: Market = {
  id: "paulista-rush-live",
  question: "Q",
  region: "SP",
  target: 1,
  category: "Fluxo",
  endsAt: Date.now() + 3600000,
  pool: { YES: 100, NO: 100 },
  participants: 1,
  history: [],
  trend: 0,
  aiPrediction: { value: 1, confidence: 0.9, side: "YES" },
  status: "live",
};

describe("markets-catalog", () => {
  it("hides legacy seed slugs", () => {
    expect(isCatalogMarket({ ...base, id: "paulista-rush", status: "live" })).toBe(false);
    expect(isCatalogMarket({ ...base, id: "paulista-rush-live", status: "live" })).toBe(true);
  });

  it("hides archived", () => {
    expect(isCatalogMarket({ ...base, archived: true })).toBe(false);
  });

  it("matchesStatusFilter closing window", () => {
    const soon = Date.now() + 10 * 60_000;
    expect(matchesStatusFilter("live", "closing", soon)).toBe(true);
    expect(matchesStatusFilter("live", "closing", Date.now() + 2 * 3600000)).toBe(false);
  });

  it("filterCatalogMarkets", () => {
    const out = filterCatalogMarkets([
      base,
      { ...base, id: "paulista-rush" },
    ]);
    expect(out).toHaveLength(1);
  });
});
