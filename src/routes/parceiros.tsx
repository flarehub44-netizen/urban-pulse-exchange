import { createFileRoute } from "@tanstack/react-router";
import { PublicNav } from "@/components/viax/public-nav";
import { PublicMobileNav } from "@/components/viax/public-mobile-nav";
import { PartnerProgramLanding } from "@/components/partner/partner-program-landing";
import { copy } from "@/copy/pt-BR";

export const Route = createFileRoute("/parceiros")({
  head: () => ({
    meta: [
      { title: copy.partner.landing.metaTitle },
      { name: "description", content: copy.partner.landing.metaDescription },
    ],
  }),
  component: ParceirosPage,
});

function ParceirosPage() {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <PublicNav variant="shell" />
      <PartnerProgramLanding />
      <PublicMobileNav />
    </div>
  );
}
