import { createFileRoute } from "@tanstack/react-router";
import { AdminCreateMarketForm } from "@/components/viax/admin-create-market-form";
import { AdminDisputePanel } from "@/components/viax/admin-dispute-panel";
import { AdminMarketsTable } from "@/components/admin/admin-markets-table";
import { AdminCommunityMarketsPanel } from "@/components/admin/admin-community-markets-panel";
import { copy } from "@/copy/pt-BR";

export const Route = createFileRoute("/admin/markets")({
  component: AdminMarketsPage,
});

function AdminMarketsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">{copy.admin.markets.title}</h1>
        <p className="text-xs text-muted-foreground">Prediction Engine · operações em tempo real</p>
      </div>
      <div className="rounded-xl border bg-card/60 p-4">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {copy.admin.markets.create}
        </h2>
        <AdminCreateMarketForm />
      </div>
      <AdminMarketsTable />
      <div className="rounded-xl border bg-card/60 p-4">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {copy.community.adminCommunityTitle}
        </h2>
        <AdminCommunityMarketsPanel />
      </div>
      <div className="rounded-xl border bg-card/60 p-4">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Disputas & rascunhos
        </h2>
        <AdminDisputePanel />
      </div>
    </div>
  );
}
