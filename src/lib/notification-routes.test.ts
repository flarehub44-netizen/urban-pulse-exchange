import { describe, expect, it } from "vitest";
import { getNotificationLink } from "@/lib/notification-routes";
import type { ViaXNotification } from "@/store/viax-store";

describe("getNotificationLink", () => {
  it("routes football market ids to /football/$marketId", () => {
    const link = getNotificationLink({
      id: "1",
      kind: "win",
      text: "Vitória",
      time: Date.now(),
      read: false,
      marketId: "fb-999999001",
    });
    expect(link).toEqual({
      to: "/football/$marketId",
      params: { marketId: "fb-999999001" },
    });
  });

  it("routes win/refund to canonical /wallet", () => {
    const link = getNotificationLink({
      id: "w1",
      kind: "win",
      text: "Vitória",
      time: Date.now(),
      read: false,
    });
    expect(link).toEqual({ to: "/wallet" });
  });

  it("routes unknown kind to canonical /positions", () => {
    const link = getNotificationLink({
      id: "p1",
      kind: "legacy" as ViaXNotification["kind"],
      text: "Atualização",
      time: Date.now(),
      read: false,
    });
    expect(link).toEqual({ to: "/positions" });
  });

  it("routes urban market ids to /markets/$marketId", () => {
    const link = getNotificationLink({
      id: "2",
      kind: "win",
      text: "Vitória",
      time: Date.now(),
      read: false,
      marketId: "mkt-abc",
    });
    expect(link).toEqual({
      to: "/markets/$marketId",
      params: { marketId: "mkt-abc" },
    });
  });
});
