import type { Market } from "@/store/viax-store";
import type { RegionData } from "@/store/viax-store";

/** Pick the most relevant live market for a map region (by pool size, prefer live/closing). */
export function findTopMarketForRegion(markets: Market[], region: RegionData): Market | undefined {
  const key = region.name.toLowerCase();
  const matches = markets.filter((m) => {
    const r = m.region.toLowerCase();
    return r.includes(key) || key.includes(r.split(" · ")[0]?.toLowerCase() ?? "");
  });
  if (!matches.length) return undefined;
  const score = (m: Market) => {
    const pool = m.pool.YES + m.pool.NO;
    const statusBoost = m.status === "live" ? 2 : m.status === "closing" ? 1.5 : 0.5;
    return pool * statusBoost;
  };
  return [...matches].sort((a, b) => score(b) - score(a))[0];
}
