/**
 * N-way parimutuel engine. Generalizes binary and football 3-way pools.
 */
import { HOUSE_RETENTION, MIN_MINORITY_RATIO, PRIZE_RATIO } from "@/lib/parimutuel";

export type OutcomePool = { id: string; pool: number };

export const poolTotalN = (outcomes: OutcomePool[]) => outcomes.reduce((sum, o) => sum + o.pool, 0);

export const probabilityN = (outcomes: OutcomePool[], outcomeId: string): number => {
  const total = poolTotalN(outcomes);
  if (total === 0) return 1 / Math.max(outcomes.length, 1);
  const o = outcomes.find((x) => x.id === outcomeId);
  return (o?.pool ?? 0) / total;
};

export const prizePoolN = (outcomes: OutcomePool[]) => poolTotalN(outcomes) * PRIZE_RATIO;

export function estimatePayoutN(outcomes: OutcomePool[], outcomeId: string, stake: number): number {
  if (stake <= 0) return 0;
  const total = poolTotalN(outcomes);
  const winPool = (outcomes.find((x) => x.id === outcomeId)?.pool ?? 0) + stake;
  if (winPool <= 0) return 0;
  const prize = (total + stake) * PRIZE_RATIO;
  return (stake / winPool) * prize;
}

export function minorityPoolRatioN(outcomes: OutcomePool[]): number {
  const total = poolTotalN(outcomes);
  if (total <= 0 || outcomes.length === 0) return 0;
  const minPool = Math.min(...outcomes.map((o) => o.pool));
  return minPool / total;
}

export function poolImbalanceWarningN(outcomes: OutcomePool[]): string | null {
  const total = poolTotalN(outcomes);
  if (total <= 0) return null;
  const minPool = Math.min(...outcomes.map((o) => o.pool));
  if (minPool === 0) return null;
  const ratio = minPool / total;
  if (ratio < MIN_MINORITY_RATIO) {
    return `Liquidez muito desequilibrada (${(ratio * 100).toFixed(1)}% no menor lado). O mercado pode ser cancelado com reembolso.`;
  }
  if (ratio < MIN_MINORITY_RATIO * 2) {
    return `Pouca liquidez em algum resultado (${(ratio * 100).toFixed(1)}%). Mínimo recomendado: ${MIN_MINORITY_RATIO * 100}%.`;
  }
  return null;
}

export { HOUSE_RETENTION, PRIZE_RATIO, MIN_MINORITY_RATIO };
