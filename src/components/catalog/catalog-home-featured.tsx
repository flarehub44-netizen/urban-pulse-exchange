import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useUnifiedCatalog } from "@/hooks/use-catalog-markets";
import { MarketCardPolymarket } from "@/components/catalog/market-card-polymarket";
import { MarketCardSkeleton } from "@/components/viax/market-card-skeleton";
import { Sparkline } from "@/components/viax/sparkline";
import { formatBRL, formatPct } from "@/lib/parimutuel";

function probabilitySparkline(leaderProb: number) {
  const base = Math.max(0.05, Math.min(0.95, leaderProb));
  return Array.from({ length: 14 }, (_, i) => {
    const t = i / 13;
    return base * (0.72 + t * 0.28) + Math.sin(i * 0.9) * 0.02;
  });
}

export function CatalogHomeFeatured() {
  const { data: markets = [], isLoading } = useUnifiedCatalog({
    sort: "volume",
    status: "live",
    limit: 1,
  });
  const featured = markets[0];

  const topOutcome = useMemo(
    () =>
      featured ? [...featured.outcomes].sort((a, b) => b.probability - a.probability)[0] : null,
    [featured],
  );
  const sparkData = useMemo(
    () => (topOutcome ? probabilitySparkline(topOutcome.probability) : []),
    [topOutcome],
  );

  if (isLoading) {
    return (
      <section className="border-b border-border/60 bg-card/20 py-8">
        <div className="mx-auto max-w-7xl px-6">
          <MarketCardSkeleton />
        </div>
      </section>
    );
  }

  if (!featured) return null;

  return (
    <section className="border-b border-border/60 bg-gradient-to-b from-primary/5 to-transparent py-8">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-primary">Destaque</p>
            <h2 className="text-xl font-semibold tracking-tight">Mercado em evidência</h2>
          </div>
          <Link to={featured.detailPath} className="text-sm text-primary hover:underline">
            Ver mercado →
          </Link>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-border/60 bg-card/80 p-6">
            <p className="text-lg font-medium leading-snug">{featured.question}</p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>Volume {formatBRL(featured.volume)}</span>
              <span>{featured.participants} participantes</span>
              {topOutcome && (
                <span>
                  Líder: {topOutcome.label} ({formatPct(topOutcome.probability)})
                </span>
              )}
            </div>
            {sparkData.length > 1 && topOutcome && (
              <div className="mt-5 rounded-xl border border-border/50 bg-background/50 p-3">
                <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                  Tendência {topOutcome.label}
                </p>
                <Sparkline data={sparkData} width={280} height={48} stroke="var(--color-primary)" />
              </div>
            )}
          </div>
          <MarketCardPolymarket market={featured} compact />
        </div>
      </div>
    </section>
  );
}
