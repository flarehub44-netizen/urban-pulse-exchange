import { createFileRoute } from "@tanstack/react-router";
import { CreativeGenerator } from "@/components/partner/creative-generator";
import { copy } from "@/copy/pt-BR";

export const Route = createFileRoute("/partner/creatives")({
  component: PartnerCreativesPage,
});

function PartnerCreativesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">{copy.partner.nav.creatives}</h1>
      <p className="text-sm text-muted-foreground">{copy.partner.creativeGenerate}</p>
      <CreativeGenerator />
    </div>
  );
}
