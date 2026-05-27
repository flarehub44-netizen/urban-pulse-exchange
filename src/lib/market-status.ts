import type { Side } from "@/lib/parimutuel";

/** Matches Postgres `market_status` (+ legacy `resolved`). */
export type MarketStatus =
  | "draft"
  | "live"
  | "closing"
  | "closed"
  | "resolving"
  | "dispute"
  | "settled"
  | "void"
  | "resolved";

export const TERMINAL_STATUSES: MarketStatus[] = ["settled", "void", "resolved"];

export function normalizeMarketStatus(status: string): MarketStatus {
  return status as MarketStatus;
}

export function isTerminalStatus(status: MarketStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/** UI: show final result banner (won/lost/refund). */
export function isSettledDisplay(status: MarketStatus): boolean {
  return status === "settled" || status === "void" || status === "resolved";
}

export function canPlaceBets(status: MarketStatus, acceptBets = true, endsAtMs?: number): boolean {
  if (!acceptBets) return false;
  if (!["live", "closing"].includes(status)) return false;
  if (endsAtMs != null && Date.now() >= endsAtMs) return false;
  return true;
}

export function statusLabel(status: MarketStatus): string {
  switch (status) {
    case "draft":
      return "Rascunho";
    case "live":
      return "Ao vivo";
    case "closing":
      return "Encerrando";
    case "closed":
      return "Fechado";
    case "resolving":
      return "Resolvendo";
    case "dispute":
      return "Em disputa";
    case "settled":
    case "resolved":
      return "Liquidado";
    case "void":
      return "Cancelado";
    default:
      return status;
  }
}

export type OpenBetMarketStatus = "live" | "closing" | "closed" | "resolving" | "dispute";

export function isOpenBetStatus(status: string): boolean {
  return !isTerminalStatus(normalizeMarketStatus(status));
}

/** Catalog list: closed to new bets or awaiting / after resolution. */
export function isMarketEndedForCatalog(status: MarketStatus): boolean {
  return status === "closed" || status === "resolving" || isSettledDisplay(status);
}

export function compareCatalogSortTier(
  a: { status: MarketStatus },
  b: { status: MarketStatus },
): number {
  return marketCatalogSortTier(a.status) - marketCatalogSortTier(b.status);
}

/** Lower tier = higher on catalog lists (open markets first). */
export function sortByCatalogTier<T extends { status: MarketStatus }>(items: T[]): T[] {
  return [...items].sort(compareCatalogSortTier);
}

/** Lower tier = higher on traffic market list (open first). */
export function marketCatalogSortTier(status: MarketStatus): number {
  switch (status) {
    case "live":
      return 0;
    case "closing":
      return 1;
    case "dispute":
      return 2;
    case "resolving":
      return 3;
    case "closed":
      return 4;
    case "settled":
    case "void":
    case "resolved":
      return 5;
    case "draft":
      return 6;
    default:
      return 3;
  }
}

export type { Side };
