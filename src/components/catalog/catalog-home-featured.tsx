import { Link } from "@tanstack/react-router";
import { useUnifiedCatalog } from "@/hooks/use-catalog-markets";
import { MarketCardPolymarket } from "@/components/catalog/market-card-polymarket";
import { MarketCardSkeleton } from "@/components/viax/market-card-skeleton";
import { formatBRL, formatPct } from "@/lib/parimutuel";

export function CatalogHomeFeatured() {
  const { data: markets = [], isLoading } = useUnifiedCatalog({
    sort: "volume",
    status: "live",
    limit: 1,
  });
  const featured = markets[0];

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

  const topOutcome = [...featured.outcomes].sort((a, b) => b.probability - a.probability)[0];

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
          </div>
          <MarketCardPolymarket market={featured} compact />
        </div>
      </div>
    </section>
  );
}
