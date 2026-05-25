import type { MarketsSearch } from "@/routes/markets";

const KEY = "viax_markets_filters";

export function loadMarketsFilters(): Partial<MarketsSearch> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Partial<MarketsSearch>) : null;
  } catch {
    return null;
  }
}

export function saveMarketsFilters(search: MarketsSearch) {
  if (typeof window === "undefined") return;
  const payload: Partial<MarketsSearch> = {
    status: search.status,
    category: search.category,
    sort: search.sort,
    hasPosition: search.hasPosition,
  };
  localStorage.setItem(KEY, JSON.stringify(payload));
}
