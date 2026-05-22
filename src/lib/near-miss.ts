import type { Market } from "@/store/viax-store";

export type NearMissMeta = {
  stake?: number;
  side?: string;
  resolved?: string;
  share?: number;
};

/** Heurística client-side (espelha trigger no servidor) para UI em tempo real. */
export function wouldNearMissBetLoss(
  market: Pick<Market, "pool">,
  stake: number,
  share?: number,
): boolean {
  const total = market.pool.YES + market.pool.NO;
  if (total <= 0) return stake >= 50;
  const yesRatio = market.pool.YES / total;
  return (
    (share ?? 0) >= 0.35 ||
    Math.abs(yesRatio - 0.5) <= 0.08 ||
    stake / total >= 0.08
  );
}

export function nearMissGapPercent(market: Pick<Market, "pool">): number {
  const total = market.pool.YES + market.pool.NO;
  if (total <= 0) return 8;
  return Math.round(Math.abs(market.pool.YES / total - 0.5) * 100);
}

export function suggestImpulseDeposit(stake: number): number {
  const base = Math.ceil(stake * 1.2);
  const chips = [50, 100, 200, 500, 1000];
  return chips.find((c) => c >= base) ?? Math.min(1000, base);
}

const SESSION_KEY = "viax_near_miss_toasts";

export function canShowNearMissToast(): boolean {
  if (typeof sessionStorage === "undefined") return true;
  const n = Number(sessionStorage.getItem(SESSION_KEY) ?? "0");
  return n < 3;
}

export function recordNearMissToast(): void {
  if (typeof sessionStorage === "undefined") return;
  const n = Number(sessionStorage.getItem(SESSION_KEY) ?? "0");
  sessionStorage.setItem(SESSION_KEY, String(n + 1));
}
