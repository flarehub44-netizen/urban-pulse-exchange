/**
 * 3-way parimutuel (football 1X2). Mirrors src/lib/parimutuel.ts for HOME/DRAW/AWAY.
 */
import { HOUSE_RETENTION, MIN_MINORITY_RATIO, PRIZE_RATIO } from "@/lib/parimutuel";

export type FootballOutcome = "HOME" | "DRAW" | "AWAY";

export interface FootballPool {
  HOME: number;
  DRAW: number;
  AWAY: number;
}

export const poolTotal3 = (p: FootballPool) => p.HOME + p.DRAW + p.AWAY;

export const probability3 = (p: FootballPool, outcome: FootballOutcome): number => {
  const total = poolTotal3(p);
  if (total === 0) return 1 / 3;
  return p[outcome] / total;
};

export const prizePool3 = (p: FootballPool) => poolTotal3(p) * PRIZE_RATIO;

export function estimatePayout3(p: FootballPool, outcome: FootballOutcome, stake: number): number {
  const total = poolTotal3(p);
  if (total <= 0) return stake;
  const poolWin = p[outcome] + stake;
  if (poolWin <= 0) return 0;
  const prize = (total + stake) * PRIZE_RATIO;
  return (stake / poolWin) * prize;
}

export function minorityPoolRatio3(p: FootballPool): number {
  const total = poolTotal3(p);
  if (total <= 0) return 0;
  return Math.min(p.HOME, p.DRAW, p.AWAY) / total;
}

export function poolImbalanceWarning3(p: FootballPool): string | null {
  const total = poolTotal3(p);
  if (total <= 0) return null;
  const minSide = Math.min(p.HOME, p.DRAW, p.AWAY);
  if (minSide === 0) return null;
  const ratio = minSide / total;
  if (ratio < MIN_MINORITY_RATIO) {
    return `Liquidez muito desequilibrada (${(ratio * 100).toFixed(1)}% no menor lado). O mercado pode ser cancelado com reembolso.`;
  }
  if (ratio < MIN_MINORITY_RATIO * 2) {
    return `Pouca liquidez em algum resultado (${(ratio * 100).toFixed(1)}%). Mínimo recomendado: ${MIN_MINORITY_RATIO * 100}%.`;
  }
  return null;
}

export { HOUSE_RETENTION, PRIZE_RATIO };
