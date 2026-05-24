import { createFileRoute } from "@tanstack/react-router";
import { PartnerLayout } from "@/components/partner/partner-layout";
import { requirePartnerRoute } from "@/lib/partner-guard";

export const Route = createFileRoute("/partner")({
  beforeLoad: ({ location }) => {
    const path = location.pathname.replace(/\/$/, "");
    if (path.endsWith("/partner/pending")) return;
    return requirePartnerRoute();
  },
  component: PartnerLayout,
});
