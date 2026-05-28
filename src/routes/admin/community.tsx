import { createFileRoute } from "@tanstack/react-router";
import { AdminCommunityMarketsPanel } from "@/components/admin/admin-community-markets-panel";
import { AdminImpactWinnersPanel } from "@/components/admin/admin-impact-winners-panel";
import { copy } from "@/copy/pt-BR";

export const Route = createFileRoute("/admin/community")({
  component: AdminCommunityPage,
});

function AdminCommunityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">{copy.admin.community.title}</h1>
        <p className="text-xs text-muted-foreground">{copy.admin.community.subtitle}</p>
      </div>
      <AdminImpactWinnersPanel />
      <AdminCommunityMarketsPanel />
    </div>
  );
}
