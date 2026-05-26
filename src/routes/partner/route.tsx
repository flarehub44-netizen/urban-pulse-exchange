import React, { Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { requirePartnerRoute } from "@/lib/partner-guard";

const PartnerLayout = React.lazy(() =>
  import("@/components/partner/partner-layout").then((m) => ({ default: m.PartnerLayout })),
);

function PartnerLayoutLazy() {
  return (
    <Suspense
      fallback={<div className="p-4 text-sm text-muted-foreground">Carregando portal...</div>}
    >
      <PartnerLayout />
    </Suspense>
  );
}

export const Route = createFileRoute("/partner")({
  beforeLoad: ({ location }) => {
    const path = location.pathname.replace(/\/$/, "");
    if (path.endsWith("/partner/pending")) return;
    return requirePartnerRoute();
  },
  component: PartnerLayoutLazy,
});
