import { motion, AnimatePresence } from "framer-motion";
import { Eye, Flame, ArrowUp, ArrowDown } from "lucide-react";
import { formatBRL } from "@/lib/parimutuel";
import { useMarketSocialProof } from "@/hooks/use-market-social-proof";
import { formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import { copy } from "@/copy/pt-BR";

export function MarketSocialProof({ marketId }: { marketId: string }) {
  const { data } = useMarketSocialProof(marketId);

  if (!data) return null;

  const { viewers, momentum, recent_bets } = data;

  return (
    <div className="space-y-2">
      {/* Viewers + Momentum */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {viewers > 0 && (
          <span className="flex items-center gap-1">
            <Eye className="size-3" /> {viewers} observando agora
          </span>
        )}
        {momentum >= 3 && (
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1 rounded-full bg-warn/10 px-2 py-0.5 text-warn"
          >
            <Flame className="size-3" /> {copy.social.predictionsAccelerating}
          </motion.span>
        )}
      </div>

      {/* Recent bets ticker */}
      {recent_bets.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border/40 bg-surface/40">
          <div className="border-b border-border/30 px-3 py-1.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {copy.social.recentPredictions}
            </p>
          </div>
          <AnimatePresence>
            {recent_bets.slice(0, 4).map((bet, i) => (
              <motion.div
                key={`${bet.handle}-${bet.created_at}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-2 border-b border-border/20 px-3 py-2 last:border-0"
              >
                {bet.side === "YES" ? (
                  <ArrowUp className="size-3 text-up shrink-0" />
                ) : (
                  <ArrowDown className="size-3 text-down shrink-0" />
                )}
                <span className="text-xs font-medium text-foreground/80 truncate flex-1">
                  {bet.name || bet.handle}
                </span>
                <span
                  className={`text-xs font-semibold shrink-0 ${bet.side === "YES" ? "text-up" : "text-down"}`}
                >
                  {bet.side} · {formatBRL(bet.stake)}
                </span>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {formatDistanceToNowStrict(new Date(bet.created_at), {
                    locale: ptBR,
                    addSuffix: true,
                  })}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
