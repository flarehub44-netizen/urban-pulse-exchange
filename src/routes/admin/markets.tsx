import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminCreateMarketForm } from "@/components/viax/admin-create-market-form";
import { AdminDisputePanel } from "@/components/viax/admin-dispute-panel";
import { AdminMarketsTable } from "@/components/admin/admin-markets-table";
import { copy } from "@/copy/pt-BR";

export const Route = createFileRoute("/admin/markets")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab:
      search.tab === "create" ||
      search.tab === "live" ||
      search.tab === "disputes"
        ? search.tab
        : undefined,
  }),
  component: AdminMarketsPage,
});

function AdminMarketsPage() {
  const { tab } = Route.useSearch();
  const activeTab = tab ?? "live";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">{copy.admin.markets.title}</h1>
        <p className="text-xs text-muted-foreground">Prediction Engine · operações em tempo real</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          to="/admin/markets"
          search={{ tab: "live" }}
          className={`rounded-full border px-3 py-1.5 text-xs transition ${
            activeTab === "live"
              ? "border-primary/60 bg-primary/15 text-primary"
              : "border-border bg-card text-muted-foreground hover:bg-surface-2"
          }`}
        >
          Operação ao vivo
        </Link>
        <Link
          to="/admin/markets"
          search={{ tab: "create" }}
          className={`rounded-full border px-3 py-1.5 text-xs transition ${
            activeTab === "create"
              ? "border-primary/60 bg-primary/15 text-primary"
              : "border-border bg-card text-muted-foreground hover:bg-surface-2"
          }`}
        >
          {copy.admin.markets.create}
        </Link>
        <Link
          to="/admin/community"
          className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-surface-2"
        >
          {copy.admin.nav.community}
        </Link>
        <Link
          to="/admin/markets"
          search={{ tab: "disputes" }}
          className={`rounded-full border px-3 py-1.5 text-xs transition ${
            activeTab === "disputes"
              ? "border-primary/60 bg-primary/15 text-primary"
              : "border-border bg-card text-muted-foreground hover:bg-surface-2"
          }`}
        >
          Disputas & rascunhos
        </Link>
      </div>

      {(activeTab === "create" || activeTab === "live") && (
        <div className="rounded-xl border bg-card/60 p-4">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {copy.admin.markets.create}
          </h2>
          <AdminCreateMarketForm />
        </div>
      )}

      {(activeTab === "live" || activeTab === "create") && <AdminMarketsTable />}

      {activeTab === "disputes" && (
        <div className="rounded-xl border bg-card/60 p-4">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Disputas & rascunhos
          </h2>
          <AdminDisputePanel />
        </div>
      )}
    </div>
  );
}
