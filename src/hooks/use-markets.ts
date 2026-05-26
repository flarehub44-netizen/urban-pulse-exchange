import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Market } from "@/store/viax-store";
import { SEED_MARKETS } from "@/store/viax-store";
import { normalizeMarketStatus } from "@/lib/market-status";
import { filterCatalogMarkets } from "@/lib/markets-catalog";
import { USE_SEED_FALLBACK } from "@/lib/data-source";

function mapMarket(row: Record<string, unknown>): Market {
  return {
    id: row.id as string,
    question: row.question as string,
    region: row.region as string,
    regionId: (row.region_id as string | null) ?? null,
    target: Number(row.target),
    category: row.category as Market["category"],
    endsAt: new Date(row.ends_at as string).getTime(),
    pool: { YES: Number(row.pool_yes), NO: Number(row.pool_no) },
    participants: Number(row.participants),
    history: [],
    trend: Number(row.trend),
    aiPrediction: {
      value: Number(row.ai_value),
      confidence: Number(row.ai_confidence),
      side: row.ai_side as "YES" | "NO",
    },
    status: normalizeMarketStatus(row.status as string),
    acceptBets: row.accept_bets !== false,
    frozen: Boolean(row.frozen),
    resolved: row.resolved as Market["resolved"],
    archived: Boolean(row.archived),
    marketKind: (row.market_kind as Market["marketKind"]) ?? "platform",
    visibility: row.visibility as Market["visibility"],
    createdBy: (row.created_by as string | null) ?? null,
  };
}

export function useMarkets() {
  return useQuery({
    queryKey: ["markets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("markets")
        .select("*")
        .eq("archived", false)
        .order("created_at");
      if (error) throw error;
      return filterCatalogMarkets((data ?? []).map((row) => mapMarket(row as Record<string, unknown>)));
    },
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: USE_SEED_FALLBACK ? filterCatalogMarkets(SEED_MARKETS) : undefined,
  });
}

export function useMarket(id: string) {
  const { data: markets } = useMarkets();
  return markets?.find((m) => m.id === id);
}

/** Markets from TanStack Query (seed placeholder in dev until fetch completes). */
export function useCatalogMarkets(): Market[] {
  const { data } = useMarkets();
  return data ?? [];
}

export function useMarketsList() {
  const query = useMarkets();
  const markets = query.data ?? [];
  return { ...query, markets };
}

export { mapMarket };
