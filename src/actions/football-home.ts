import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  getFixturesByDateAllResilient,
  type ApiFootballFixtureDto,
} from "@/lib/api-football.server";

const FIVE_MIN_MS = 5 * 60 * 1000;
const cache = new Map<string, { expiresAt: number; value: FootballHomepagePayload }>();

const inputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

type MatchStatusType = "live" | "scheduled" | "finished" | "other";

export type FootballHomepageFixture = {
  id: number;
  leagueId: number;
  leagueName: string;
  leagueCountry: string;
  season: number;
  kickoffAt: string;
  statusShort: string;
  statusType: MatchStatusType;
  elapsed: number | null;
  homeTeam: {
    id: number;
    name: string;
    logoUrl: string | null;
  };
  awayTeam: {
    id: number;
    name: string;
    logoUrl: string | null;
  };
  goalsHome: number | null;
  goalsAway: number | null;
  venue: string | null;
};

export type FootballHomepageLeague = {
  leagueId: number;
  name: string;
  country: string;
  matches: number;
};

export type FootballHomepagePayload = {
  date: string;
  fixtures: FootballHomepageFixture[];
  leagues: FootballHomepageLeague[];
  counters: {
    total: number;
    live: number;
    scheduled: number;
    finished: number;
  };
  meta: {
    generatedAt: string;
    cacheHit: boolean;
  };
};

function getStatusType(statusShort: string): MatchStatusType {
  const live = new Set(["1H", "HT", "2H", "ET", "BT", "P", "LIVE", "SUSP", "INT"]);
  const finished = new Set(["FT", "AET", "PEN"]);
  const scheduled = new Set(["NS", "TBD"]);
  if (live.has(statusShort)) return "live";
  if (finished.has(statusShort)) return "finished";
  if (scheduled.has(statusShort)) return "scheduled";
  return "other";
}

function mapFixture(dto: ApiFootballFixtureDto): FootballHomepageFixture {
  return {
    id: dto.api_fixture_id,
    leagueId: dto.api_league_id,
    leagueName: dto.league_name,
    leagueCountry: dto.league_country,
    season: dto.season,
    kickoffAt: dto.kickoff_at,
    statusShort: dto.status_short,
    statusType: getStatusType(dto.status_short),
    elapsed: dto.elapsed,
    homeTeam: {
      id: dto.home_team_id,
      name: dto.home_team_name,
      logoUrl: dto.home_logo_url,
    },
    awayTeam: {
      id: dto.away_team_id,
      name: dto.away_team_name,
      logoUrl: dto.away_logo_url,
    },
    goalsHome: dto.goals_home,
    goalsAway: dto.goals_away,
    venue: dto.venue,
  };
}

function summarize(fixtures: FootballHomepageFixture[]) {
  const counters = { total: fixtures.length, live: 0, scheduled: 0, finished: 0 };
  const leagueMap = new Map<number, FootballHomepageLeague>();

  for (const f of fixtures) {
    if (f.statusType === "live") counters.live += 1;
    else if (f.statusType === "scheduled") counters.scheduled += 1;
    else if (f.statusType === "finished") counters.finished += 1;

    const current = leagueMap.get(f.leagueId);
    if (current) {
      current.matches += 1;
    } else {
      leagueMap.set(f.leagueId, {
        leagueId: f.leagueId,
        name: f.leagueName,
        country: f.leagueCountry,
        matches: 1,
      });
    }
  }

  const leagues = [...leagueMap.values()].sort((a, b) => a.name.localeCompare(b.name));
  return { counters, leagues };
}

export const getFootballHomepageFn = createServerFn({ method: "GET" })
  .inputValidator(inputSchema)
  .handler(async ({ data }) => {
    const key = data.date;
    const now = Date.now();
    const hit = cache.get(key);
    if (hit && hit.expiresAt > now) {
      return { ...hit.value, meta: { ...hit.value.meta, cacheHit: true } } satisfies FootballHomepagePayload;
    }

    const season = Number.parseInt(data.date.slice(0, 4), 10);
    const { fixtures: dtos } = await getFixturesByDateAllResilient(data.date, season, [2024, 2023, 2022]);
    const fixtures = dtos.map(mapFixture).sort((a, b) => {
      const byKickoff = new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime();
      if (byKickoff !== 0) return byKickoff;
      return a.leagueName.localeCompare(b.leagueName);
    });
    const { counters, leagues } = summarize(fixtures);
    const payload: FootballHomepagePayload = {
      date: data.date,
      fixtures,
      leagues,
      counters,
      meta: {
        generatedAt: new Date().toISOString(),
        cacheHit: false,
      },
    };
    cache.set(key, { value: payload, expiresAt: now + FIVE_MIN_MS });
    return payload;
  });
