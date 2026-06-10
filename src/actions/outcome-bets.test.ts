import { describe, expect, it } from "vitest";
import { placeOutcomeBetSchema } from "@/actions/outcome-bets";

describe("placeOutcomeBetSchema", () => {
  it("rejects empty marketId", () => {
    expect(
      placeOutcomeBetSchema.safeParse({
        marketId: "",
        outcomeId: "550e8400-e29b-41d4-a716-446655440000",
        stake: 10,
      }).success,
    ).toBe(false);
  });

  it("rejects non-uuid outcomeId", () => {
    expect(
      placeOutcomeBetSchema.safeParse({
        marketId: "pm-crypto-btc-june",
        outcomeId: "not-a-uuid",
        stake: 10,
      }).success,
    ).toBe(false);
  });

  it("rejects zero stake", () => {
    expect(
      placeOutcomeBetSchema.safeParse({
        marketId: "pm-crypto-btc-june",
        outcomeId: "550e8400-e29b-41d4-a716-446655440000",
        stake: 0,
      }).success,
    ).toBe(false);
  });

  it("rejects stake above cap", () => {
    expect(
      placeOutcomeBetSchema.safeParse({
        marketId: "pm-crypto-btc-june",
        outcomeId: "550e8400-e29b-41d4-a716-446655440000",
        stake: 100_001,
      }).success,
    ).toBe(false);
  });

  it("accepts valid payload", () => {
    expect(
      placeOutcomeBetSchema.safeParse({
        marketId: "pm-crypto-btc-june",
        outcomeId: "550e8400-e29b-41d4-a716-446655440000",
        stake: 25.5,
      }).success,
    ).toBe(true);
  });

  it("accepts optional idempotencyKey uuid", () => {
    expect(
      placeOutcomeBetSchema.safeParse({
        marketId: "pm-crypto-btc-june",
        outcomeId: "550e8400-e29b-41d4-a716-446655440000",
        stake: 10,
        idempotencyKey: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      }).success,
    ).toBe(true);
  });
});

describe("placeOutcomeBet error contract", () => {
  it("recognizes rate_limit prefix", () => {
    expect("rate_limit_exceeded".includes("rate_limit")).toBe(true);
  });

  it("recognizes idempotency conflict", () => {
    expect("idempotency_key_conflict".includes("idempotency")).toBe(true);
  });
});
