import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CatalogLayout } from "@/components/catalog/catalog-layout";
import { OutcomeOrderBox } from "@/components/catalog/outcome-order-box";
import { InlineError } from "@/components/viax/inline-error";
import { MarketCardSkeleton } from "@/components/viax/market-card-skeleton";
import { formatPct } from "@/lib/parimutuel";
import { fetchCatalogMarketById } from "@/hooks/use-catalog-markets";
import { catalogFooterLinks } from "@/lib/catalog-footer-links";

export const Route = createFileRoute("/pm/$marketId")({
  component: PredictionMarketDetail,
});

function PredictionMarketDetail() {
  const { marketId } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["prediction-market-detail", marketId],
    queryFn: () => fetchCatalogMarketById(marketId),
  });

  if (isLoading) {
    return (
      <CatalogLayout vertical="copa" title="Mercado">
        <MarketCardSkeleton />
      </CatalogLayout>
    );
  }

  if (error || !data) {
    return (
      <CatalogLayout vertical="copa" title="Mercado">
        <InlineError message={error ? (error as Error).message : "Mercado não encontrado"} />
      </CatalogLayout>
    );
  }

  return (
    <CatalogLayout
      vertical={data.vertical}
      title={data.question}
      footerLinks={catalogFooterLinks(data.vertical)}
    >
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <ul className="space-y-3">
            {data.outcomes.map((o) => (
              <li
                key={o.id}
                className="flex justify-between rounded-lg border border-border/60 px-4 py-3"
              >
                <span>{o.label}</span>
                <span className="font-semibold tabular-nums">{formatPct(o.probability)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="surface-card p-4">
          <h2 className="mb-4 font-medium">Fazer previsão</h2>
          <OutcomeOrderBox market={data} />
        </div>
      </div>
    </CatalogLayout>
  );
}
