import { describe, expect, it, vi } from "vitest";

describe("leagues actions types", () => {
  it("LeagueMember includes composite fields", async () => {
    const mod = await import("@/actions/leagues");
    const sample: mod.LeagueMember = {
      user_id: "u1",
      name: "Test",
      handle: "test",
      avatar: "",
      division: "bronze",
      is_me: true,
      rank: 1,
      score: 500,
      roi: 0.1,
      volume: 100,
      accuracy: 0.6,
      settled_count: 5,
      delta_rank: 0,
    };
    expect(sample.score).toBe(500);
  });
});
