import React, { Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { requireAdminRoute } from "@/lib/admin-guard";

const AdminLayout = React.lazy(() =>
  import("@/components/admin/admin-layout").then((m) => ({ default: m.AdminLayout })),
);

function AdminLayoutLazy() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Carregando painel...</div>}>
      <AdminLayout />
    </Suspense>
  );
}

export const Route = createFileRoute("/admin")({
  beforeLoad: () => requireAdminRoute(),
  component: AdminLayoutLazy,
});
