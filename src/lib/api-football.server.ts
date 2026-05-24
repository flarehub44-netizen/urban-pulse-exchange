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

type ApiFixtureItem = {
  fixture: {
    id: number;
    date: string;
    status: { short: string };
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
    throw new Error(`API-Football ${res.status}: ${text.slice(0, 200)}`);
  }

  const body = (await res.json()) as ApiResponse<T>;
  if (body.errors && Object.keys(body.errors).length > 0) {
    throw new Error(`API-Football errors: ${JSON.stringify(body.errors)}`);
  }

  return body.response ?? [];
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
): Promise<ApiFootballFixtureDto[]> {
  const out: ApiFootballFixtureDto[] = [];
  for (const leagueId of leagueIds) {
    const items = await apiGet<ApiFixtureItem>("/fixtures", {
      date,
      league: String(leagueId),
    });
    for (const item of items) {
      out.push(mapFixtureItem(item));
    }
    await sleep(350);
  }
  return out;
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
