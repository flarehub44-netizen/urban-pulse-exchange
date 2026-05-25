import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/integrations/supabase/loose";
import { useAuth } from "@/hooks/use-auth";

export interface MarketAlert {
  id: string;
  marketId: string;
  side: "YES" | "NO";
  threshold: number;
  triggered: boolean;
  createdAt: number;
}

type AlertRow = {
  id: string;
  market_id: string;
  side: string;
  threshold: number;
  triggered: boolean;
  created_at: string;
};

function mapAlert(row: Record<string, unknown>): MarketAlert {
  return {
    id: row.id as string,
    marketId: row.market_id as string,
    side: row.side as "YES" | "NO",
    threshold: Number(row.threshold),
    triggered: Boolean(row.triggered),
    createdAt: new Date(row.created_at as string).getTime(),
  };
}

export function useMarketAlerts(marketId?: string) {
  const { userId } = useAuth();

  return useQuery({
    queryKey: ["market-alerts", userId, marketId],
    queryFn: async () => {
      let q = db
        .from("market_alerts")
        .select("id, market_id, side, threshold, triggered, created_at")
        .eq("user_id", userId as string)
        .eq("triggered", false)
        .order("created_at", { ascending: false });
      if (marketId) q = q.eq("market_id", marketId);
      const { data, error } = await q;
      if (error) throw error;
      return ((data as AlertRow[] | null) ?? []).map(mapAlert);
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useCreateMarketAlert() {
  const qc = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    mutationFn: async ({
      marketId,
      side,
      threshold,
    }: {
      marketId: string;
      side: "YES" | "NO";
      threshold: number;
    }) => {
      const { data, error } = await db
        .from("market_alerts")
        .insert({ user_id: userId as string, market_id: marketId, side, threshold })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["market-alerts", userId, vars.marketId] });
      qc.invalidateQueries({ queryKey: ["market-alerts", userId, undefined] });
    },
  });
}

export function useDeleteMarketAlert() {
  const qc = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await db.from("market_alerts").delete().eq("id", alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["market-alerts", userId] });
    },
  });
}
