import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/supabase/loose";
import { useViaX } from "@/store/viax-store";
import type { Market } from "@/store/viax-store";
import { normalizeMarketStatus } from "@/lib/market-status";
import { filterCatalogMarkets } from "@/lib/markets-catalog";

function mapMarket(row: Record<string, unknown>): Market {
  return {
    id: row.id as string,
    question: row.question as string,
    region: row.region as string,
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
  };
}

export function useMarkets() {
  return useQuery({
    queryKey: ["markets"],
    queryFn: async () => {
      const { data, error } = (await db
        .from("markets")
        .select("*")
        .eq("archived", false)
        .order("created_at")) as {
        data: Record<string, unknown>[] | null;
        error: Error | null;
      };
      if (error) throw error;
      return filterCatalogMarkets((data ?? []).map(mapMarket));
    },
    staleTime: 30_000,
  });
}

export function useMarket(id: string) {
  const { data: markets } = useMarkets();
  return markets?.find((m) => m.id === id);
}

/** DB markets when loaded, else filtered Zustand fallback (landing + app). */
export function useCatalogMarkets(): Market[] {
  const { data: dbMarkets } = useMarkets();
  const zustandMarkets = useViaX((s) => s.markets);
  return dbMarkets ?? filterCatalogMarkets(zustandMarkets);
}

export { mapMarket };
