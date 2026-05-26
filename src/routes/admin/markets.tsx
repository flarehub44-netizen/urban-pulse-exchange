import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminCreateMarketForm } from "@/components/viax/admin-create-market-form";
import { AdminDisputePanel } from "@/components/viax/admin-dispute-panel";
import { AdminMarketsTable } from "@/components/admin/admin-markets-table";
import { AdminCommunityMarketsPanel } from "@/components/admin/admin-community-markets-panel";
import { copy } from "@/copy/pt-BR";

export const Route = createFileRoute("/admin/markets")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab:
      search.tab === "create" ||
      search.tab === "live" ||
      search.tab === "community" ||
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
        {(
          [
            { key: "live", label: "Operação ao vivo" },
            { key: "create", label: copy.admin.markets.create },
            { key: "community", label: copy.community.adminCommunityTitle },
            { key: "disputes", label: "Disputas & rascunhos" },
          ] as const
        ).map((item) => (
          <Link
            key={item.key}
            to="/admin/markets"
            search={{ tab: item.key }}
            className={`rounded-full border px-3 py-1.5 text-xs transition ${
              activeTab === item.key
                ? "border-primary/60 bg-primary/15 text-primary"
                : "border-border bg-card text-muted-foreground hover:bg-surface-2"
            }`}
          >
            {item.label}
          </Link>
        ))}
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

      {activeTab === "community" && (
        <div className="rounded-xl border bg-card/60 p-4">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {copy.community.adminCommunityTitle}
          </h2>
          <AdminCommunityMarketsPanel />
        </div>
      )}

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
