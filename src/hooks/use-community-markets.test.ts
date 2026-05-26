import { describe, expect, it } from "vitest";
import { shouldDeferCommunityNotFound } from "./use-community-markets";

describe("shouldDeferCommunityNotFound", () => {
  it("does not defer forever for anonymous users after fetch", () => {
    expect(
      shouldDeferCommunityNotFound({
        authReady: true,
        communityFetched: true,
        hasMarket: false,
      }),
    ).toBe(false);
  });

  it("defers while auth is not ready", () => {
    expect(
      shouldDeferCommunityNotFound({
        authReady: false,
        communityFetched: false,
        hasMarket: false,
      }),
    ).toBe(true);
  });

  it("defers while community fetch is pending", () => {
    expect(
      shouldDeferCommunityNotFound({
        authReady: true,
        communityFetched: false,
        hasMarket: false,
      }),
    ).toBe(true);
  });

  it("never defers when market is already available", () => {
    expect(
      shouldDeferCommunityNotFound({
        authReady: false,
        communityFetched: false,
        hasMarket: true,
      }),
    ).toBe(false);
  });
});
