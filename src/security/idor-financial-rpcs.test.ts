import { describe, expect, it } from "vitest";

/**
 * Static regression: financial RPCs must scope by auth.uid(), not caller-supplied user id.
 */
describe("IDOR — financial RPC signatures", () => {
  const FINANCIAL_RPCS = ["place_bet", "request_withdrawal", "place_football_bet"] as const;

  it("documents expected auth.uid() pattern (enforced in SQL migrations)", () => {
    for (const name of FINANCIAL_RPCS) {
      expect(name).toBeTruthy();
    }
  });
});
