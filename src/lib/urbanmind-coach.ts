import type { UrbanMindDigest } from "@/hooks/use-urbanmind-digest";
import type { Market } from "@/store/viax-store";

export function buildDailyMission(
  markets: Market[],
  neighborhood: string | null,
  city: string,
): Market | undefined {
  const region = (neighborhood?.trim() || city || "").toLowerCase();
  const live = markets.filter((m) => m.status === "live" || m.status === "closing");
  const regional = live.filter(
    (m) => m.region.toLowerCase().includes(region) || region.includes(m.region.toLowerCase()),
  );
  const pool = regional.length > 0 ? regional : live;
  return [...pool].sort((a, b) => Math.abs(b.trend) - Math.abs(a.trend))[0];
}

export function coachContinuityLine(digest: UrbanMindDigest | undefined): string | null {
  if (!digest?.body) return null;
  return digest.body;
}

export function weeklyPrecisionChallenge(currentAccuracy: number): {
  label: string;
  target: number;
  progress: number;
} {
  const target = Math.min(0.99, currentAccuracy + 0.02);
  const progress = currentAccuracy >= target ? 1 : currentAccuracy / target;
  return {
    label: `Meta: ${(target * 100).toFixed(0)}% de precisão esta semana`,
    target,
    progress: Math.min(1, progress),
  };
}
