/**
 * ViaX parimutuel engine (client-side reference).
 * House retains 10% of total pool. Never expose as "fee" — show as
 * "Prize Pool" (the 90% distributable to winners).
 */
export const HOUSE_RETENTION = 0.1;
export const PRIZE_RATIO = 1 - HOUSE_RETENTION;
/** Minimum share of total pool on minority side; below → void/refund. */
export const MIN_MINORITY_RATIO = 0.05;

export type SettlementAction = "settle" | "void";

/**
 * Client-side mirror of `validate_market_pools` (Postgres).
 * Used for UI warnings before bet placement.
 */
export function validateMarketPools(
  poolYes: number,
  poolNo: number,
  winningSide: Side,
): SettlementAction {
  const total = poolYes + poolNo;
  const poolWin = winningSide === "YES" ? poolYes : poolNo;
  if (poolWin <= 0) return "void";

  const minSide = Math.min(poolYes, poolNo);
  if (minSide === 0) {
    if (winningSide === "YES" && poolNo === 0) return "settle";
    if (winningSide === "NO" && poolYes === 0) return "settle";
    return "void";
  }

  if (total > 0 && minSide / total < MIN_MINORITY_RATIO) return "void";
  return "settle";
}

/** True when settlement would proceed for this side (not void). */
export function isValidForSettlement(poolYes: number, poolNo: number, winningSide: Side): boolean {
  return validateMarketPools(poolYes, poolNo, winningSide) === "settle";
}

/** Share of total pool on the smaller side (0–1). */
export function minorityPoolRatio(poolYes: number, poolNo: number): number {
  const total = poolYes + poolNo;
  if (total <= 0) return 0;
  return Math.min(poolYes, poolNo) / total;
}

export function poolImbalanceWarning(poolYes: number, poolNo: number): string | null {
  const total = poolYes + poolNo;
  if (total <= 0) return null;
  const minSide = Math.min(poolYes, poolNo);
  if (minSide === 0) return null;
  const ratio = minSide / total;
  if (ratio < MIN_MINORITY_RATIO) {
    return `Liquidez muito desequilibrada (${(ratio * 100).toFixed(1)}% no menor lado). O mercado pode ser cancelado com reembolso.`;
  }
  if (ratio < MIN_MINORITY_RATIO * 2) {
    return `Pouca liquidez no lado oposto (${(ratio * 100).toFixed(1)}%). Mínimo recomendado: ${MIN_MINORITY_RATIO * 100}%.`;
  }
  return null;
}

export type Side = "YES" | "NO";

export interface Pool {
  YES: number;
  NO: number;
}

export const poolTotal = (p: Pool) => p.YES + p.NO;

/** Implied probability for a side. */
export const probability = (p: Pool, side: Side): number => {
  const total = poolTotal(p);
  if (total === 0) return 0.5;
  return p[side] / total;
};

/** Prize pool = distributable pool (90% of total). */
export const prizePool = (p: Pool) => poolTotal(p) * PRIZE_RATIO;

/**
 * Payout for a stake placed on `side`, given current pools.
 * Winner gets their stake back + proportional share of the losing side
 * (after 10% retention).
 */
export const estimatePayout = (
  p: Pool,
  side: Side,
  stake: number,
): { payout: number; profit: number; roi: number; share: number } => {
  if (stake <= 0) return { payout: 0, profit: 0, roi: 0, share: 0 };
  const other: Side = side === "YES" ? "NO" : "YES";
  const newSide = p[side] + stake;
  const distributable = p[other] * PRIZE_RATIO;
  const share = stake / newSide;
  const payout = stake + share * distributable;
  const profit = payout - stake;
  const roi = profit / stake;
  return { payout, profit, roi, share };
};

export const CURRENCY_CODE = "BRL";

/** Valor monetário com código ISO após o número — ex.: `1.234,56 BRL` */
export const formatBRL = (n: number) => {
  const fractionDigits = n >= 1000 ? 0 : 2;
  const formatted = n.toLocaleString("pt-BR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
  return `${formatted} ${CURRENCY_CODE}`;
};

export const formatPct = (n: number, digits = 1) => `${(n * 100).toFixed(digits)}%`;

export const formatCompact = (n: number) =>
  Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(n);
