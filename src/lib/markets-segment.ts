import { copy } from "@/copy/pt-BR";
import type { MarketSegment } from "@/routes/markets";

const VALID_SEGMENTS: MarketSegment[] = ["transito", "futebol", "outros"];

export function parseMarketSegment(search: Record<string, unknown>): MarketSegment {
  if (search.view === "community") return "outros";
  const raw = search.segment;
  if (raw === "transito" || raw === "futebol" || raw === "outros") return raw;
  return "transito";
}

export function isMarketSegment(value: unknown): value is MarketSegment {
  return VALID_SEGMENTS.includes(value as MarketSegment);
}

export function segmentDescription(segment: MarketSegment): string {
  if (segment === "futebol") return copy.markets.segmentFutebol;
  if (segment === "outros") return copy.markets.segmentOutros;
  return copy.markets.segmentTransito;
}
