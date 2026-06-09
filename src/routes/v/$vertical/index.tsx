import { createFileRoute } from "@tanstack/react-router";
import { CatalogLayout } from "@/components/catalog/catalog-layout";
import { CatalogMarketGrid } from "@/components/catalog/catalog-market-grid";
import { CatalogSearchBar } from "@/components/catalog/catalog-search-bar";
import { isVerticalSlug, verticalLabel, type MarketVertical } from "@/lib/catalog-market";

export const Route = createFileRoute("/v/$vertical/")({
  component: VerticalPage,
});

function VerticalPage() {
  const { vertical: raw } = Route.useParams();
  const search = Route.useSearch() as { q?: string };
  if (!isVerticalSlug(raw)) {
    return <p className="text-muted-foreground">Categoria inválida.</p>;
  }
  const vertical = raw as MarketVertical;

  return (
    <CatalogLayout vertical={vertical} title={verticalLabel(vertical)}>
      <CatalogSearchBar vertical={vertical} initialQ={search.q} />
      <CatalogMarketGrid vertical={vertical} q={search.q} sort="volume" status="live" />
    </CatalogLayout>
  );
}
