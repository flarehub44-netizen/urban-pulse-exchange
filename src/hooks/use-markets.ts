import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Market } from "@/store/viax-store";

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
    status: row.status as Market["status"],
    resolved: row.resolved as Market["resolved"],
  };
}

export function useMarkets() {
  return useQuery({
    queryKey: ["markets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("markets")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return (data ?? []).map(mapMarket);
    },
    staleTime: 30_000,
  });
}

export function useMarket(id: string) {
  const { data: markets } = useMarkets();
  return markets?.find((m) => m.id === id);
}

export { mapMarket };
