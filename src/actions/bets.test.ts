import { describe, expect, it } from "vitest";
import { placeBetSchema } from "./bets";

describe("placeBetSchema", () => {
  it("requires idempotencyKey", () => {
    const result = placeBetSchema.safeParse({
      marketId: "market-1",
      side: "YES",
      stake: 10,
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid payload with UUID idempotency key", () => {
    const result = placeBetSchema.safeParse({
      marketId: "market-1",
      side: "NO",
      stake: 25,
      idempotencyKey: "3a71e4e0-5df7-4f5f-ac2e-f1f5f11f97a9",
    });
    expect(result.success).toBe(true);
  });
});
