const STORAGE_KEY = "viax-football-favorite-teams";

export function loadFavoriteTeams(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v) && v > 0)
      .slice(0, 200);
  } catch {
    return [];
  }
}

export function saveFavoriteTeams(teamIds: number[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(teamIds));
}

export function toggleFavoriteTeam(teamId: number) {
  const current = new Set(loadFavoriteTeams());
  if (current.has(teamId)) current.delete(teamId);
  else current.add(teamId);
  const next = [...current].sort((a, b) => a - b);
  saveFavoriteTeams(next);
  return next;
}
