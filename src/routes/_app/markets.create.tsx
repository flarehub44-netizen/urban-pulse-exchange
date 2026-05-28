import { createFileRoute, Link } from "@tanstack/react-router";
import { CommunityMarketCreateForm } from "@/components/viax/community-market-create-form";
import { ImpactProgramBanner } from "@/components/viax/impact-program-banner";
import { requireAuth } from "@/lib/auth-guards";
import { copy } from "@/copy/pt-BR";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_app/markets/create")({
  beforeLoad: () => requireAuth(),
  head: () => ({
    meta: [
      { title: `${copy.community.createTitle} · ViaX` },
      { name: "description", content: copy.community.createSubtitle },
    ],
  }),
  component: CreateCommunityMarketPage,
});

function CreateCommunityMarketPage() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <Link
        to="/markets"
        search={{ segment: "outros" }}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {copy.community.backToList}
      </Link>
      <ImpactProgramBanner />
      <CommunityMarketCreateForm />
    </div>
  );
}
