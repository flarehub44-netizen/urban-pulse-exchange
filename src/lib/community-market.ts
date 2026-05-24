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
};

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
  };
}

export function communityShareUrl(marketId: string, accessToken?: string | null) {
  if (typeof window === "undefined") return `/markets/${marketId}`;
  const base = `${window.location.origin}/markets/${marketId}`;
  if (!accessToken) return base;
  return `${base}?access=${encodeURIComponent(accessToken)}`;
}
