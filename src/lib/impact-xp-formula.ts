/** Client-side mirror of DB impact XP formula (Option B) for tests and docs. */
export type ImpactFormulaInput = {
  volumeValid: number;
  uniqueBettors: number;
  slaOk: boolean;
  hasReviewedReport: boolean;
};

export function computeImpactXpAwarded(input: ImpactFormulaInput): number {
  const { volumeValid, uniqueBettors, slaOk, hasReviewedReport } = input;
  if (volumeValid < 1500 || uniqueBettors < 12) return 0;

  let xpBase = Math.round(volumeValid * 0.025) + uniqueBettors * 12;
  let multiplier = 1;
  if (uniqueBettors >= 30) multiplier *= 1.15;
  if (slaOk) multiplier *= 1.1;
  if (hasReviewedReport) multiplier *= 0.5;

  return Math.min(2500, Math.max(0, Math.round(xpBase * multiplier)));
}
