import { afterEach, describe, expect, it, vi } from "vitest";
import { getFixturesByDate, mapFixtureItem } from "./api-football.server";

describe("api-football mapper", () => {
  it("maps fixture response shape", () => {
    const dto = mapFixtureItem({
      fixture: { id: 1, date: "2025-08-01T19:00:00+00:00", status: { short: "NS", elapsed: null } },
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

describe("api-football requests", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends season when loading fixtures by date", async () => {
    process.env.API_FOOTBALL_KEY = "test-key";
    vi.spyOn(global, "setTimeout").mockImplementation((handler: TimerHandler) => {
      if (typeof handler === "function") handler();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ response: [] }),
      headers: new Headers(),
    } as Response);

    await getFixturesByDate("2026-05-27", [71], 2026);

    const firstCall = fetchMock.mock.calls[0]?.[0];
    expect(typeof firstCall).toBe("string");
    const requestUrl = new URL(String(firstCall));
    expect(requestUrl.searchParams.get("date")).toBe("2026-05-27");
    expect(requestUrl.searchParams.get("league")).toBe("71");
    expect(requestUrl.searchParams.get("season")).toBe("2026");
  });

  it("falls back to allowed season range when plan rejects requested season", async () => {
    process.env.API_FOOTBALL_KEY = "test-key";
    vi.spyOn(global, "setTimeout").mockImplementation((handler: TimerHandler) => {
      if (typeof handler === "function") handler();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: [],
          errors: { plan: "Free plans do not have access to this season, try from 2022 to 2024." },
        }),
        headers: new Headers(),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: [] }),
        headers: new Headers(),
      } as Response);

    await getFixturesByDate("2026-05-27", [71], 2026);

    const firstUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    const secondUrl = new URL(String(fetchMock.mock.calls[1]?.[0]));
    expect(firstUrl.searchParams.get("season")).toBe("2026");
    expect(secondUrl.searchParams.get("season")).toBe("2024");
  });
});
