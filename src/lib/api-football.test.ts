import { describe, expect, it } from "vitest";
import { mapFixtureItem } from "./api-football.server";

describe("api-football mapper", () => {
  it("maps fixture response shape", () => {
    const dto = mapFixtureItem({
      fixture: { id: 1, date: "2025-08-01T19:00:00+00:00", status: { short: "NS" } },
      league: { id: 71, season: 2025, name: "Serie A", country: "Brazil" },
      teams: {
        home: { id: 126, name: "São Paulo" },
        away: { id: 131, name: "Corinthians" },
      },
      goals: { home: null, away: null },
    });
    expect(dto.api_fixture_id).toBe(1);
    expect(dto.home_team_name).toBe("São Paulo");
    expect(dto.status_short).toBe("NS");
  });
});
