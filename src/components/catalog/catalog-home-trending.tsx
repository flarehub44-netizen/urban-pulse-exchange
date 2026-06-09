import { Link } from "@tanstack/react-router";
import { VerticalChipsNav } from "@/components/catalog/vertical-chips-nav";
import { CatalogMarketGrid } from "@/components/catalog/catalog-market-grid";

export function CatalogHomeTrending() {
  return (
    <section className="border-b border-border/60 py-12">
      <div className="mx-auto max-w-7xl px-6">
        <VerticalChipsNav active="trending" className="mb-6" />
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Mercados em alta</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Previsões ao vivo em trânsito, esportes, crypto, política e mais.
            </p>
          </div>
          <Link
            to="/v/$vertical"
            params={{ vertical: "crypto" }}
            className="text-sm text-primary hover:underline"
          >
            Explorar tudo →
          </Link>
        </div>
        <CatalogMarketGrid status="live" sort="volume" limit={12} />
      </div>
    </section>
  );
}
