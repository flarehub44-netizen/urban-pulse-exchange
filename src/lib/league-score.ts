/** Composite league score (mirrors SQL _league_compute_score). */

export function clampRoi(roi: number): number {
  return Math.max(-1, Math.min(2, roi));
}

export function computeLeagueScore(
  roi: number,
  volume: number,
  accuracy: number,
  maxVolume: number,
): number {
  const roiPart = (400 * (clampRoi(roi) + 1)) / 3;
  const volPart =
    maxVolume > 0 ? (300 * Math.log(1 + Math.max(volume, 0))) / Math.log(1 + maxVolume) : 0;
  const accPart = 300 * Math.max(0, Math.min(1, accuracy));
  return Math.round(roiPart + volPart + accPart);
}

export function formatLeagueInviteUrl(code: string, origin = "https://viax.life"): string {
  return `${origin.replace(/\/$/, "")}/leagues/join/${encodeURIComponent(code)}`;
}
