import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Star, Radio } from "lucide-react";
import { formatCompact, formatPct } from "@/lib/parimutuel";
import type { CatalogMarket } from "@/lib/catalog-market";
import { cn } from "@/lib/utils";
import { useWatchlist } from "@/hooks/use-watchlist";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OutcomeOrderBox } from "@/components/catalog/outcome-order-box";
import { MarketQuickBetRouter } from "@/components/catalog/market-quick-bet-router";

type MarketCardPolymarketProps = {
  market: CatalogMarket;
  compact?: boolean;
};

export function MarketCardPolymarket({ market, compact }: MarketCardPolymarketProps) {
  const { ids, toggle } = useWatchlist();
  const watched = ids.includes(market.id);
  const [quickOutcome, setQuickOutcome] = useState<string | null>(null);
  const visibleOutcomes = market.outcomes.slice(0, compact ? 2 : 3);
  const isLive = market.status === "live" || market.status === "closing";

  return (
    <>
      <article
        data-testid="catalog-market-card"
        className="surface-card-interactive flex h-full flex-col p-4"
      >
        <div className="mb-3 flex items-start gap-3">
          {market.imageUrl ? (
            <img src={market.imageUrl} alt="" className="size-10 rounded-lg object-cover" />
          ) : (
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Radio className="size-5" />
            </div>
          )}
          <Link
            to={market.detailPath}
            className="min-w-0 flex-1 font-medium leading-snug hover:text-primary"
          >
            {market.question}
          </Link>
          <button
            type="button"
            onClick={() => toggle(market.id)}
            className={cn("shrink-0 p-1", watched ? "text-warn" : "text-muted-foreground/40")}
            aria-label="Favorito"
          >
            <Star className={cn("size-4", watched && "fill-warn")} />
          </button>
        </div>

        <div className="space-y-2 flex-1">
          {visibleOutcomes.map((o) => (
            <div key={o.id} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                {o.label}
              </span>
              <span className="text-sm font-semibold tabular-nums">{formatPct(o.probability)}</span>
              {market.type === "multi_outcome" && isLive && (
                <button
                  type="button"
                  onClick={() => setQuickOutcome(o.id)}
                  className="rounded-md bg-up/15 px-2 py-0.5 text-xs font-medium text-up hover:bg-up/25"
                >
                  Sim
                </button>
              )}
            </div>
          ))}
        </div>

        {market.type !== "multi_outcome" && isLive && (
          <MarketQuickBetRouter market={market} className="mt-3 grid grid-cols-2 gap-2" />
        )}

        <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3 text-xs text-muted-foreground">
          <span>{formatCompact(market.volume)} Vol.</span>
          {isLive && (
            <span className="flex items-center gap-1 text-up">
              <span className="size-1.5 rounded-full bg-up animate-pulse" />
              AO VIVO
            </span>
          )}
        </div>
      </article>

      <Dialog open={!!quickOutcome} onOpenChange={(o) => !o && setQuickOutcome(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-left text-base leading-snug">
              {market.question}
            </DialogTitle>
          </DialogHeader>
          {quickOutcome && market.type === "multi_outcome" && (
            <OutcomeOrderBox
              market={market}
              initialOutcomeId={quickOutcome}
              onSuccess={() => setQuickOutcome(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
