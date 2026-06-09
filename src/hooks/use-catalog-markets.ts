import { useQuery } from "@tanstack/react-query";
import { listCatalogMarketsFn } from "@/actions/catalog";
import { supabase } from "@/integrations/supabase/client";
import {
  parseCatalogMarkets,
  parseCatalogMarket,
  type CatalogMarket,
  type CatalogTopicCount,
  type MarketVertical,
} from "@/lib/catalog-market";

export type CatalogFilters = {
  vertical?: MarketVertical | null;
  topic?: string | null;
  status?: string;
  sort?: "volume" | "closing" | "trend" | "new";
  limit?: number;
  offset?: number;
  q?: string | null;
};

export function unifiedCatalogQueryKey(filters: CatalogFilters) {
  return ["unified-catalog", filters] as const;
}

export function useUnifiedCatalog(filters: CatalogFilters = {}) {
  return useQuery({
    queryKey: unifiedCatalogQueryKey(filters),
    queryFn: async (): Promise<CatalogMarket[]> =>
      listCatalogMarketsFn({
        data: {
          vertical: filters.vertical ?? undefined,
          topic: filters.topic ?? undefined,
          status: filters.status ?? "live",
          sort: filters.sort ?? "volume",
          limit: filters.limit ?? 48,
          offset: filters.offset ?? 0,
          q: filters.q ?? undefined,
        },
      }),
    staleTime: 30_000,
  });
}

export function useCatalogTopicCounts(vertical?: MarketVertical | null) {
  return useQuery({
    queryKey: ["catalog-topic-counts", vertical ?? "all"],
    queryFn: async (): Promise<CatalogTopicCount[]> => {
      const { data, error } = await supabase.rpc("list_catalog_topic_counts", {
        p_vertical: vertical ?? undefined,
      });
      if (error) throw error;
      if (!Array.isArray(data)) return [];
      return data.map((row) => {
        const r = row as Record<string, unknown>;
        return {
          slug: String(r.slug ?? ""),
          label: String(r.label ?? ""),
          vertical: r.vertical as MarketVertical,
          count: Number(r.count ?? 0),
        };
      });
    },
    staleTime: 60_000,
  });
}

export function usePredictionMarketDetail(marketId: string) {
  return useQuery({
    queryKey: ["prediction-market", marketId],
    enabled: !!marketId,
    queryFn: async (): Promise<CatalogMarket | null> => {
      const { data, error } = await supabase.rpc("list_catalog_markets", {
        p_status: "all",
        p_limit: 1,
        p_q: marketId,
      });
      if (error) throw error;
      const markets = parseCatalogMarkets(data);
      return markets.find((m) => m.id === marketId) ?? null;
    },
  });
}

export async function fetchCatalogMarketById(marketId: string): Promise<CatalogMarket | null> {
  const { data, error } = await supabase
    .from("prediction_markets")
    .select("id, question, vertical, status, ends_at, image_url, participants")
    .eq("id", marketId)
    .maybeSingle();
  if (error || !data) return null;

  const { data: outcomes } = await supabase
    .from("market_outcomes")
    .select("id, slug, label, pool, sort_order")
    .eq("market_id", marketId)
    .order("sort_order");

  const pools = outcomes ?? [];
  const total = pools.reduce((s, o) => s + Number(o.pool), 0);

  return parseCatalogMarket({
    id: data.id,
    type: "multi_outcome",
    source: "prediction",
    question: data.question,
    vertical: data.vertical,
    status: data.status,
    endsAt: data.ends_at,
    imageUrl: data.image_url,
    volume: total,
    participants: data.participants,
    trend: 0,
    outcomes: pools.map((o) => ({
      id: o.id,
      slug: o.slug,
      label: o.label,
      pool: Number(o.pool),
      probability: total > 0 ? Number(o.pool) / total : 1 / pools.length,
    })),
    topics: [],
    detailPath: `/pm/${data.id}`,
  });
}
