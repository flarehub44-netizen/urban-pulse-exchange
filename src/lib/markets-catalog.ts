import type { Market } from "@/store/viax-store";
import type { MarketStatus } from "@/lib/market-status";

/** Legacy seed slugs superseded by *-live markets. */
const LEGACY_SEED_IDS = new Set([
  "paulista-rush",
  "marginal-tietê",
  "faria-lima",
  "23-maio",
  "rebouças",
  "anhangabaú",
  "imigrantes",
  "brigadeiro",
]);

/** Client-side filter when `archived` column is not on cached rows yet. */
export function isCatalogMarket(
  m: Pick<Market, "id" | "status"> & { archived?: boolean; marketKind?: Market["marketKind"] },
): boolean {
  if (m.archived === true) return false;
  if (m.marketKind === "community") return false;
  if (LEGACY_SEED_IDS.has(m.id)) return false;
  return true;
}

export function filterCatalogMarkets<T extends Market>(markets: T[]): T[] {
  return markets.filter(isCatalogMarket);
}

export const MARKET_CATEGORY_FILTERS = [
  "Fluxo",
  "Velocidade",
  "Congestionamento",
  "Evento",
] as const;

export type MarketCategoryFilter = (typeof MARKET_CATEGORY_FILTERS)[number];

export const MARKET_STATUS_FILTERS = [
  "all",
  "live",
  "closing",
  "dispute",
  "resolved",
  "draft",
] as const;

export type MarketStatusFilter = (typeof MARKET_STATUS_FILTERS)[number];

export function matchesStatusFilter(
  status: MarketStatus,
  key: MarketStatusFilter,
  endsAtMs?: number,
): boolean {
  if (key === "all") return true;
  if (key === "live") return status === "live";
  if (key === "closing") {
    if (status === "closing") return true;
    if (status === "live" && endsAtMs != null) {
      return endsAtMs - Date.now() < 30 * 60_000;
    }
    return false;
  }
  if (key === "dispute") return status === "dispute";
  if (key === "draft") return status === "draft";
  if (key === "resolved") {
    return status === "settled" || status === "void" || status === "resolved";
  }
  return true;
}
