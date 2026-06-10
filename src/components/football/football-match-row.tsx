import { Link } from "@tanstack/react-router";
import { formatPct } from "@/lib/parimutuel";
import type { CatalogMarket } from "@/lib/catalog-market";
import { cn } from "@/lib/utils";
import { MarketQuickBetRouter } from "@/components/catalog/market-quick-bet-router";

type FootballMatchRowProps = {
  market: CatalogMarket;
  kickoffLabel?: string;
};

export function FootballMatchRow({ market, kickoffLabel }: FootballMatchRowProps) {
  const home = market.outcomes.find((o) => o.id === "HOME");
  const draw = market.outcomes.find((o) => o.id === "DRAW");
  const away = market.outcomes.find((o) => o.id === "AWAY");

  return (
    <div className="flex flex-col gap-3 border-b border-border/60 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        {kickoffLabel && <p className="mb-1 text-xs text-muted-foreground">{kickoffLabel}</p>}
        <Link to={market.detailPath} className="font-medium hover:text-primary">
          {market.question}
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:w-[min(100%,420px)]">
        {[home, draw, away].map((o, i) =>
          o ? (
            <div
              key={o.id}
              className={cn(
                "rounded-lg border px-2 py-2 text-center text-xs font-semibold",
                i === 0 && "border-up/30 bg-up/10 text-up",
                i === 1 && "border-border bg-muted/40",
                i === 2 && "border-down/30 bg-down/10 text-down",
              )}
            >
              <div className="truncate">{o.label}</div>
              <div className="tabular-nums">{formatPct(o.probability, 0)}</div>
            </div>
          ) : null,
        )}
      </div>
      <MarketQuickBetRouter market={market} className="shrink-0 sm:w-48" />
    </div>
  );
}
