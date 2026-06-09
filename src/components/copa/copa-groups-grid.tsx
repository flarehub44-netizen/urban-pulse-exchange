import { CatalogMarketGrid } from "@/components/catalog/catalog-market-grid";

export function CopaGroupsGrid() {
  return (
    <CatalogMarketGrid
      vertical="copa"
      topic="grupos-copa"
      status="live"
      sort="volume"
      emptyTitle="Mercados de grupos em breve"
    />
  );
}
