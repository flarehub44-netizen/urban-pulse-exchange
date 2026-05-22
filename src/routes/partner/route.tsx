import { createFileRoute } from "@tanstack/react-router";
import { PartnerLayout } from "@/components/partner/partner-layout";
import { requirePartnerRoute } from "@/lib/partner-guard";

export const Route = createFileRoute("/partner")({
  beforeLoad: () => requirePartnerRoute(),
  component: PartnerLayout,
});
