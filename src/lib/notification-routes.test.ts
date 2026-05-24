import { describe, expect, it } from "vitest";
import { getNotificationLink } from "@/lib/notification-routes";

describe("getNotificationLink", () => {
  it("routes football market ids to /football/$marketId", () => {
    const link = getNotificationLink({
      id: "1",
      kind: "win",
      title: "Vitória",
      body: "",
      read: false,
      createdAt: Date.now(),
      marketId: "fb-999999001",
    });
    expect(link).toEqual({
      to: "/football/$marketId",
      params: { marketId: "fb-999999001" },
    });
  });

  it("routes urban market ids to /markets/$marketId", () => {
    const link = getNotificationLink({
      id: "2",
      kind: "win",
      title: "Vitória",
      body: "",
      read: false,
      createdAt: Date.now(),
      marketId: "mkt-abc",
    });
    expect(link).toEqual({
      to: "/markets/$marketId",
      params: { marketId: "mkt-abc" },
    });
  });
});
