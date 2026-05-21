import type { Market } from "@/store/viax-store";

const REGION_KEYWORDS: Record<string, string[]> = {
  paulista: ["paulista", "paulista-rush"],
  marginal: ["marginal", "tietê", "marginal-tietê"],
  "faria lima": ["faria", "faria-lima"],
  pinheiros: ["pinheiros"],
  moema: ["moema"],
};

/** Suggest a live market when a feed post has no marketId (region text match or top live pool). */
export function suggestMarketForPost(text: string, markets: Market[]): Market | undefined {
  if (!markets.length) return undefined;
  const lower = text.toLowerCase();
  const active = markets.filter((m) => m.status === "live" || m.status === "closing");

  for (const m of active) {
    const regionParts = m.region
      .toLowerCase()
      .split(/[·•,]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 3);
    if (regionParts.some((part) => lower.includes(part))) return m;
    if (lower.includes(m.id.replace(/-/g, " ")) || lower.includes(m.id)) return m;
  }

  for (const [key, ids] of Object.entries(REGION_KEYWORDS)) {
    if (lower.includes(key)) {
      const hit = active.find((x) => ids.some((id) => x.id === id || x.id.includes(id)));
      if (hit) return hit;
    }
  }

  const live = active.filter((m) => m.status === "live" || m.status === "closing");
  const pool = (m: Market) => m.pool.YES + m.pool.NO;
  const sorted = [...(live.length ? live : active)].sort((a, b) => pool(b) - pool(a));
  return sorted[0];
}
