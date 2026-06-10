import { describe, expect, it } from "vitest";
import {
  buildLeagueActionNowItems,
  buildLeagueInviteMessage,
  buildWhatsAppShareUrl,
  formatDeltaRank,
  leagueUrgency,
} from "@/lib/league-engagement";
import type { League, LeagueRankSummary } from "@/actions/leagues";

const baseLeague: League = {
  id: "a",
  name: "Equipe",
  invite_code: "ABCD1234",
  is_creator: false,
  member_count: 8,
  is_public: false,
  season_ends_at: new Date(Date.now() + 12 * 3_600_000).toISOString(),
};

const rank: LeagueRankSummary = {
  ok: true,
  rank: 4,
  score: 500,
  member_count: 8,
};

describe("league-engagement", () => {
  it("formatDeltaRank", () => {
    expect(formatDeltaRank(2)).toBe("↑2");
    expect(formatDeltaRank(-1)).toBe("↓1");
    expect(formatDeltaRank(0)).toBeNull();
  });

  it("leagueUrgency thresholds", () => {
    const now = Date.now();
    expect(leagueUrgency(new Date(now + 10 * 3_600_000).toISOString(), now)).toBe("urgent");
    expect(leagueUrgency(new Date(now + 48 * 3_600_000).toISOString(), now)).toBe("soon");
    expect(leagueUrgency(new Date(now + 100 * 3_600_000).toISOString(), now)).toBe("none");
  });

  it("buildLeagueInviteMessage includes url", () => {
    const msg = buildLeagueInviteMessage("Test", "CODE1234", "https://viax.life");
    expect(msg).toContain("Test");
    expect(msg).toContain("/leagues/join/CODE1234");
  });

  it("buildWhatsAppShareUrl encodes message", () => {
    expect(buildWhatsAppShareUrl("oi")).toContain("wa.me");
    expect(buildWhatsAppShareUrl("oi")).toContain("oi");
  });

  it("buildLeagueActionNowItems prioritizes urgent season", () => {
    const items = buildLeagueActionNowItems([baseLeague], { a: rank }, Date.now());
    expect(items).toHaveLength(1);
    expect(items[0]!.priority).toBeGreaterThan(900);
  });
});
