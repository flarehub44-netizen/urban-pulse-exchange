import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MarketStatus } from "@/lib/market-status";

export type TrafficEndedMarket = {
  id: string;
  question: string;
  region: string;
  status: MarketStatus;
  target: number;
  category: string;
  resolution_metric: string | null;
  comparison_op: string | null;
  resolved: "YES" | "NO" | null;
  poolYes: number;
  poolNo: number;
  participants: number;
  startsAt: number;
  endsAt: number;
  settledAt: number | null;
  rawValue: number | null;
  derivedSide: string | null;
  confidence: number | null;
};

export function mapTrafficEndedRow(row: Record<string, unknown>): TrafficEndedMarket {
  return {
    id: row.id as string,
    question: row.question as string,
    region: row.region as string,
    status: row.status as MarketStatus,
    target: Number(row.target),
    category: row.category as string,
    resolution_metric: (row.resolution_metric as string | null) ?? null,
    comparison_op: (row.comparison_op as string | null) ?? null,
    resolved: (row.resolved as "YES" | "NO" | null) ?? null,
    poolYes: Number(row.pool_yes),
    poolNo: Number(row.pool_no),
    participants: Number(row.participants),
    startsAt: row.starts_at ? new Date(row.starts_at as string).getTime() : 0,
    endsAt: row.ends_at ? new Date(row.ends_at as string).getTime() : 0,
    settledAt: row.settled_at ? new Date(row.settled_at as string).getTime() : null,
    rawValue: row.raw_value != null ? Number(row.raw_value) : null,
    derivedSide: (row.derived_side as string | null) ?? null,
    confidence: row.confidence != null ? Number(row.confidence) : null,
  };
}

export function useTrafficEndedMarkets(limit = 50, enabled = true) {
  return useQuery({
    queryKey: ["traffic-ended-markets", limit],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_traffic_ended_markets", {
        p_limit: limit,
      });
      if (error) throw error;
      const rows = Array.isArray(data)
        ? (data as Record<string, unknown>[])
        : ((data as { items?: Record<string, unknown>[] })?.items ?? []);
      return rows.map(mapTrafficEndedRow);
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}
