import { describe, expect, it } from "vitest";
import { isValidForSettlement, validateMarketPools } from "@/lib/parimutuel";

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

  it("isValidForSettlement mirrors validateMarketPools", () => {
    expect(isValidForSettlement(70_000, 30_000, "YES")).toBe(true);
    expect(isValidForSettlement(97_000, 3_000, "YES")).toBe(false);
  });
});
