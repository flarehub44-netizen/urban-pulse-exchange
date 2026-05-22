import { useQuery } from "@tanstack/react-query";
import { db as supabase } from "@/integrations/supabase/loose";

export interface MarketResolutionAudit {
  id: string;
  status: string;
  raw_value: number | null;
  derived_side: string | null;
  confidence: number | null;
  source: string;
  validation: Record<string, unknown>;
  payout_summary: Record<string, unknown> | null;
  created_at: string;
}

export interface MarketAudit {
  resolutions: MarketResolutionAudit[];
  ledger: { amount: number; kind: string; meta: Record<string, unknown>; created_at: string }[];
  snapshots: { raw_value: number; metric: string; recorded_at: string }[];
  is_admin?: boolean;
}

export function useMarketAudit(marketId: string) {
  return useQuery({
    queryKey: ["market-audit", marketId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_market_audit", {
        p_market_id: marketId,
      });
      if (error) throw error;
      return data as MarketAudit;
    },
    enabled: !!marketId,
    staleTime: 30_000,
  });
}
