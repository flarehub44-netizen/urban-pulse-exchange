import { describe, expect, it } from "vitest";
import { placeCryptoSlotBetSchema } from "@/actions/crypto-slots";

describe("placeCryptoSlotBetSchema", () => {
  it("accepts up side", () => {
    expect(
      placeCryptoSlotBetSchema.safeParse({ marketId: "cs-202601011200", side: "up", stake: 50 })
        .success,
    ).toBe(true);
  });

  it("rejects invalid side", () => {
    expect(
      placeCryptoSlotBetSchema.safeParse({ marketId: "cs-1", side: "yes", stake: 50 }).success,
    ).toBe(false);
  });
});
