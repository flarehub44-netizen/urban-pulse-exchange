import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchCatalogMarketById } from "@/hooks/use-catalog-markets";
import { OutcomeOrderBox } from "@/components/catalog/outcome-order-box";
import { InlineError } from "@/components/viax/inline-error";
import { MarketCardSkeleton } from "@/components/viax/market-card-skeleton";
import { formatPct } from "@/lib/parimutuel";

export const Route = createFileRoute("/pm/$marketId")({
  component: PredictionMarketDetail,
});

function PredictionMarketDetail() {
  const { marketId } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["prediction-market-detail", marketId],
    queryFn: () => fetchCatalogMarketById(marketId),
  });

  return (
    <div className="space-y-6">
      {isLoading && <MarketCardSkeleton />}
      {error && <InlineError message={(error as Error).message} />}
      {data && (
        <div className="mx-auto grid max-w-4xl gap-8 lg:grid-cols-2">
          <div>
            <h1 className="text-2xl font-semibold leading-tight">{data.question}</h1>
            <ul className="mt-6 space-y-3">
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
      )}
    </div>
  );
}
