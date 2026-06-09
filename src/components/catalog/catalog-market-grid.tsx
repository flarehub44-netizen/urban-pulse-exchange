import { MarketCardPolymarket } from "@/components/catalog/market-card-polymarket";
import { MarketCardSkeleton } from "@/components/viax/market-card-skeleton";
import { InlineError } from "@/components/viax/inline-error";
import { EmptyState } from "@/components/viax/empty-state";
import { useUnifiedCatalog, type CatalogFilters } from "@/hooks/use-catalog-markets";

type CatalogMarketGridProps = CatalogFilters & {
  emptyTitle?: string;
};

export function CatalogMarketGrid({
  emptyTitle = "Nenhum mercado encontrado",
  ...filters
}: CatalogMarketGridProps) {
  const { data, isLoading, error, refetch } = useUnifiedCatalog(filters);

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <MarketCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return <InlineError message={error.message} onRetry={() => void refetch()} />;
  }

  if (!data?.length) {
    return (
      <EmptyState title={emptyTitle} description="Volte em breve ou explore outra categoria." />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {data.map((m) => (
        <MarketCardPolymarket key={`${m.source}-${m.id}`} market={m} />
      ))}
    </div>
  );
}
