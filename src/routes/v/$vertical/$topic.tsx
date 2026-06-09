import { createFileRoute } from "@tanstack/react-router";
import { CatalogLayout } from "@/components/catalog/catalog-layout";
import { CatalogMarketGrid } from "@/components/catalog/catalog-market-grid";
import { isVerticalSlug, verticalLabel, type MarketVertical } from "@/lib/catalog-market";

export const Route = createFileRoute("/v/$vertical/$topic")({
  component: TopicPage,
});

function TopicPage() {
  const { vertical: raw, topic } = Route.useParams();
  if (!isVerticalSlug(raw)) {
    return <p className="text-muted-foreground">Categoria inválida.</p>;
  }
  const vertical = raw as MarketVertical;

  return (
    <CatalogLayout vertical={vertical} topic={topic} title={verticalLabel(vertical)}>
      <CatalogMarketGrid vertical={vertical} topic={topic} sort="volume" status="live" />
    </CatalogLayout>
  );
}
