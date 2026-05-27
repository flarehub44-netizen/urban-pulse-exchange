/**
 * API-Sports Football v3 client — server only. Never import from client bundles.
 */

const BASE_URL = "https://v3.football.api-sports.io";

export type ApiFootballFixtureDto = {
  api_fixture_id: number;
  api_league_id: number;
  season: number;
  kickoff_at: string;
  status_short: string;
  elapsed: number | null;
  home_team_id: number;
  home_team_name: string;
  away_team_id: number;
  away_team_name: string;
  goals_home: number | null;
  goals_away: number | null;
  goals_home_ht: number | null;
  goals_away_ht: number | null;
  home_logo_url: string | null;
  away_logo_url: string | null;
  venue: string | null;
  league_name: string;
  league_country: string;
  raw: Record<string, unknown>;
};

export type AllGamesFallbackResult = {
  fixtures: ApiFootballFixtureDto[];
  triedSeasons: number[];
  seasonUsed: number | null;
};
export type AllGamesResilientResult = {
  fixtures: ApiFootballFixtureDto[];
  triedSeasons: number[];
  seasonUsed: number | null;
  strategyUsed: "date_only" | "date_plus_season_fallback" | "none";
  attempts: string[];
};

type ApiFixtureItem = {
  fixture: {
    id: number;
    date: string;
    status: { short: string; elapsed: number | null };
    venue?: { name?: string };
  };
  league: { id: number; season: number; name: string; country: string };
  teams: {
    home: { id: number; name: string; logo?: string };
    away: { id: number; name: string; logo?: string };
  };
  goals: { home: number | null; away: number | null };
  score?: {
    halftime?: { home: number | null; away: number | null };
    fulltime?: { home: number | null; away: number | null };
  };
};

type ApiResponse<T> = {
  response: T[];
  errors?: Record<string, string>;
};

function getApiKey(): string {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error("API_FOOTBALL_KEY is not configured");
  return key;
}

async function apiGet<T>(path: string, params: Record<string, string>): Promise<T[]> {
  const url = new URL(path, BASE_URL);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), {
    headers: { "x-apisports-key": getApiKey() },
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) {
      const retryAfterSec = parseInt(res.headers.get("Retry-After") ?? "60", 10);
      console.warn("[API-Football] rate limited", { path, retryAfterSec });
      await sleep(retryAfterSec * 1000);
    }
    throw new Error(`API-Football ${res.status}: ${text.slice(0, 200)}`);
  }

  const body = (await res.json()) as ApiResponse<T>;
  if (body.errors && Object.keys(body.errors).length > 0) {
    throw new Error(`API-Football errors: ${JSON.stringify(body.errors)}`);
  }

  return body.response ?? [];
}

function parsePlanSeasonFallback(errorMessage: string): number | null {
  const match = errorMessage.match(/from\s+(\d{4})\s+to\s+(\d{4})/i);
  if (!match) return null;
  const upper = Number.parseInt(match[2] ?? "", 10);
  if (!Number.isFinite(upper) || upper < 1900) return null;
  return upper;
}

export function mapFixtureItem(item: ApiFixtureItem): ApiFootballFixtureDto {
  const ft = item.score?.fulltime;
  const ht = item.score?.halftime;
  const goalsHome = ft?.home ?? item.goals.home;
  const goalsAway = ft?.away ?? item.goals.away;

  return {
    api_fixture_id: item.fixture.id,
    api_league_id: item.league.id,
    season: item.league.season,
    kickoff_at: item.fixture.date,
    status_short: item.fixture.status.short,
    elapsed: item.fixture.status.elapsed ?? null,
    home_team_id: item.teams.home.id,
    home_team_name: item.teams.home.name,
    away_team_id: item.teams.away.id,
    away_team_name: item.teams.away.name,
    goals_home: goalsHome,
    goals_away: goalsAway,
    goals_home_ht: ht?.home ?? null,
    goals_away_ht: ht?.away ?? null,
    home_logo_url: item.teams.home.logo ?? null,
    away_logo_url: item.teams.away.logo ?? null,
    venue: item.fixture.venue?.name ?? null,
    league_name: item.league.name,
    league_country: item.league.country,
    raw: item as unknown as Record<string, unknown>,
  };
}

export async function getFixturesByDate(
  date: string,
  leagueIds: number[],
  season: number,
): Promise<ApiFootballFixtureDto[]> {
  const out: ApiFootballFixtureDto[] = [];
  const requestedSeason = Math.trunc(season);
  for (const leagueId of leagueIds) {
    let items: ApiFixtureItem[];
    try {
      items = await apiGet<ApiFixtureItem>("/fixtures", {
        date,
        league: String(leagueId),
        season: String(requestedSeason),
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const fallbackSeason = parsePlanSeasonFallback(msg);
      if (fallbackSeason == null || fallbackSeason === requestedSeason) {
        throw error;
      }
      console.warn("[API-Football] season fallback", {
        requestedSeason,
        fallbackSeason,
        leagueId,
        date,
      });
      items = await apiGet<ApiFixtureItem>("/fixtures", {
        date,
        league: String(leagueId),
        season: String(fallbackSeason),
      });
    }
    for (const item of items) {
      out.push(mapFixtureItem(item));
    }
    await sleep(350);
  }
  return out;
}

export async function getFixturesByDateAll(
  date: string,
  season: number,
): Promise<ApiFootballFixtureDto[]> {
  const requestedSeason = Math.trunc(season);
  let items: ApiFixtureItem[];
  try {
    items = await apiGet<ApiFixtureItem>("/fixtures", {
      date,
      season: String(requestedSeason),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const fallbackSeason = parsePlanSeasonFallback(msg);
    if (fallbackSeason == null || fallbackSeason === requestedSeason) {
      throw error;
    }
    console.warn("[API-Football] season fallback", {
      requestedSeason,
      fallbackSeason,
      date,
      mode: "all_games",
    });
    items = await apiGet<ApiFixtureItem>("/fixtures", {
      date,
      season: String(fallbackSeason),
    });
  }
  return items.map(mapFixtureItem);
}

export async function getFixturesByDateAllDateOnly(date: string): Promise<ApiFootballFixtureDto[]> {
  const items = await apiGet<ApiFixtureItem>("/fixtures", { date });
  return items.map(mapFixtureItem);
}

export async function getFixturesByDateAllWithFallback(
  date: string,
  preferredSeason: number,
  fallbackSeasons: number[],
): Promise<AllGamesFallbackResult> {
  const candidates = [preferredSeason, ...fallbackSeasons]
    .map((s) => Math.trunc(s))
    .filter((s, i, arr) => Number.isFinite(s) && s > 1900 && arr.indexOf(s) === i);
  const triedSeasons: number[] = [];

  for (const season of candidates) {
    triedSeasons.push(season);
    const fixtures = await getFixturesByDateAll(date, season);
    if (fixtures.length > 0) {
      return { fixtures, triedSeasons, seasonUsed: season };
    }
  }

  return { fixtures: [], triedSeasons, seasonUsed: null };
}

export async function getFixturesByDateAllResilient(
  date: string,
  preferredSeason: number,
  fallbackSeasons: number[],
): Promise<AllGamesResilientResult> {
  const attempts: string[] = [];
  try {
    const dateOnly = await getFixturesByDateAllDateOnly(date);
    attempts.push(`date_only:${dateOnly.length}`);
    if (dateOnly.length > 0) {
      return {
        fixtures: dateOnly,
        triedSeasons: [],
        seasonUsed: null,
        strategyUsed: "date_only",
        attempts,
      };
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    attempts.push(`date_only_error:${msg.slice(0, 120)}`);
  }

  const fallback = await getFixturesByDateAllWithFallback(date, preferredSeason, fallbackSeasons);
  attempts.push(
    `season_fallback:${fallback.fixtures.length};tried=${fallback.triedSeasons.join(",") || "none"}`,
  );
  if (fallback.fixtures.length > 0) {
    return {
      fixtures: fallback.fixtures,
      triedSeasons: fallback.triedSeasons,
      seasonUsed: fallback.seasonUsed,
      strategyUsed: "date_plus_season_fallback",
      attempts,
    };
  }

  return {
    fixtures: [],
    triedSeasons: fallback.triedSeasons,
    seasonUsed: fallback.seasonUsed,
    strategyUsed: "none",
    attempts,
  };
}

export async function getFixtureById(fixtureId: number): Promise<ApiFootballFixtureDto | null> {
  const items = await apiGet<ApiFixtureItem>("/fixtures", { id: String(fixtureId) });
  if (!items.length) return null;
  return mapFixtureItem(items[0]!);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function formatDateYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function dateRangeDays(from: Date, days: number): string[] {
  const out: string[] = [];
  for (let i = 0; i <= days; i++) {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    out.push(formatDateYmd(d));
  }
  return out;
}
