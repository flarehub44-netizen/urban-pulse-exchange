import type { Market } from "@/store/viax-store";
import { normalizeMarketStatus } from "@/lib/market-status";

export type CommunityMarketRow = {
  id: string;
  question: string;
  region: string;
  region_id?: string | null;
  target: number;
  category: Market["category"];
  ends_at: string;
  pool_yes: number;
  pool_no: number;
  participants: number;
  trend: number;
  ai_side: "YES" | "NO";
  ai_value: number;
  ai_confidence: number;
  status: string;
  accept_bets?: boolean;
  frozen?: boolean;
  resolved?: Market["resolved"];
  archived?: boolean;
  market_kind: "community";
  visibility: "public" | "unlisted";
  created_by?: string | null;
  resolution_mode?: string;
  has_access_token?: boolean;
  cover_url?: string | null;
};

const BRASILIA_OFFSET = "-03:00";
/** Minimum lead before ends_at (matches DB: must be > now() + 1 hour). */
export const COMMUNITY_ENDS_MIN_LEAD_MS = 61 * 60 * 1000;

export function defaultCommunityEndDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function defaultCommunityEndTime(): string {
  const d = new Date();
  const nextHour = new Date(d);
  nextHour.setMinutes(0, 0, 0);
  nextHour.setHours(nextHour.getHours() + 1);
  const h = String(nextHour.getHours()).padStart(2, "0");
  return `${h}:00`;
}

/** Builds ISO timestamp for community market end (America/Sao_Paulo, UTC−3). */
export function buildCommunityEndsAtIso(date: string, time: string): string {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  if (!y || !mo || !d || Number.isNaN(h) || Number.isNaN(mi)) {
    throw new Error("invalid_datetime");
  }
  const mm = String(mo).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  const hh = String(h).padStart(2, "0");
  const min = String(mi).padStart(2, "0");
  return `${y}-${mm}-${dd}T${hh}:${min}:00${BRASILIA_OFFSET}`;
}

export function communityEndsAtMs(date: string, time: string): number {
  return new Date(buildCommunityEndsAtIso(date, time)).getTime();
}

export function validateCommunityEndsAt(
  date: string,
  time: string,
  nowMs = Date.now(),
): string | null {
  try {
    const endsMs = communityEndsAtMs(date, time);
    if (endsMs <= nowMs + COMMUNITY_ENDS_MIN_LEAD_MS) return "too_soon";
    const maxMs = nowMs + 90 * 24 * 60 * 60 * 1000;
    if (endsMs > maxMs) return "too_far";
    return null;
  } catch {
    return "invalid";
  }
}

export function mapCommunityMarketRow(row: CommunityMarketRow): Market {
  return {
    id: row.id,
    question: row.question,
    region: row.region,
    regionId: row.region_id ?? null,
    target: Number(row.target),
    category: row.category,
    endsAt: new Date(row.ends_at).getTime(),
    pool: { YES: Number(row.pool_yes), NO: Number(row.pool_no) },
    participants: Number(row.participants),
    history: [],
    trend: Number(row.trend),
    aiPrediction: {
      value: Number(row.ai_value),
      confidence: Number(row.ai_confidence),
      side: row.ai_side,
    },
    status: normalizeMarketStatus(row.status),
    acceptBets: row.accept_bets !== false,
    frozen: Boolean(row.frozen),
    resolved: row.resolved,
    archived: Boolean(row.archived),
    marketKind: "community",
    visibility: row.visibility,
    createdBy: row.created_by ?? null,
    coverUrl: row.cover_url ?? null,
  };
}

export function communityShareUrl(marketId: string, accessToken?: string | null) {
  if (typeof window === "undefined") return `/markets/${marketId}`;
  const base = `${window.location.origin}/markets/${marketId}`;
  if (!accessToken) return base;
  return `${base}?access=${encodeURIComponent(accessToken)}`;
}
