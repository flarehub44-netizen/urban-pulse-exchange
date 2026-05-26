import { Eye, Flame } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MarketSocialProof } from "@/hooks/use-market-social-proof";
import { copy } from "@/copy/pt-BR";

/** Static social proof (no framer ticker) — safe on public market pages. */
export function MarketSocialProofLite({ marketId }: { marketId: string }) {
  const { data } = useQuery({
    queryKey: ["market-social-proof-lite", marketId],
    queryFn: async () => {
      const { data: row, error } = await supabase.rpc("get_market_social_proof", {
        p_market_id: marketId,
      });
      if (error) throw error;
      return row as MarketSocialProof;
    },
    enabled: Boolean(marketId),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  if (!data) return null;

  const { viewers, momentum, recent_bets } = data;
  if (viewers <= 0 && momentum < 3 && recent_bets.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/40 bg-surface/40 px-3 py-2 text-xs text-muted-foreground">
      <div className="flex flex-wrap items-center gap-3">
        {viewers > 0 && (
          <span className="flex items-center gap-1">
            <Eye className="size-3" /> {viewers} observando agora
          </span>
        )}
        {momentum >= 3 && (
          <span className="flex items-center gap-1 text-warn">
            <Flame className="size-3" /> {copy.social.predictionsAccelerating}
          </span>
        )}
      </div>
      {recent_bets.length > 0 && (
        <p className="mt-1.5 text-foreground/80">
          {recent_bets.length} previsões recentes neste mercado — entre na disputa com saldo Pix.
        </p>
      )}
    </div>
  );
}
