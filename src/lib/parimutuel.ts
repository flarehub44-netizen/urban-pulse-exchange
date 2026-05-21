/**
 * ViaX parimutuel engine (client-side reference).
 * House retains 10% of total pool. Never expose as "fee" — show as
 * "Prize Pool" (the 90% distributable to winners).
 */
export const HOUSE_RETENTION = 0.1;
export const PRIZE_RATIO = 1 - HOUSE_RETENTION;

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

export const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: n >= 1000 ? 0 : 2,
  });

export const formatPct = (n: number, digits = 1) =>
  `${(n * 100).toFixed(digits)}%`;

export const formatCompact = (n: number) =>
  Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(n);
