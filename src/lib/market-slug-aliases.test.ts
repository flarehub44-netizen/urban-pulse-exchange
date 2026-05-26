import { describe, expect, it } from "vitest";
import { isKnownLegacyMarketId, resolveMarketRouteId } from "@/lib/market-slug-aliases";

describe("market-slug-aliases", () => {
  it("maps legacy slugs to *-live ids", () => {
    expect(resolveMarketRouteId("brigadeiro")).toBe("brigadeiro-live");
    expect(resolveMarketRouteId("faria-lima")).toBe("faria-lima-live");
    expect(resolveMarketRouteId("marginal-tietê")).toBe("marginal-tiete-live");
  });

  it("returns canonical id unchanged", () => {
    expect(resolveMarketRouteId("brigadeiro-live")).toBe("brigadeiro-live");
    expect(resolveMarketRouteId("cm-abc")).toBe("cm-abc");
  });

  it("detects known legacy ids", () => {
    expect(isKnownLegacyMarketId("23-maio")).toBe(true);
    expect(isKnownLegacyMarketId("random-id")).toBe(false);
  });
});
