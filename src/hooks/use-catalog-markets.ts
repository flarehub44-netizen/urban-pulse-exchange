import { useQuery } from "@tanstack/react-query";
import { listCatalogMarketsFn } from "@/actions/catalog";
import { supabase } from "@/integrations/supabase/client";
import {
  parseCatalogMarkets,
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
  const { data, error } = await supabase.rpc("list_catalog_markets", {
    p_status: "all",
    p_limit: 48,
    p_q: marketId,
  });
  if (error) return null;
  const markets = parseCatalogMarkets(data);
  return markets.find((m) => m.id === marketId) ?? null;
}
