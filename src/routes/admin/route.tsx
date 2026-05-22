import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/admin-layout";
import { requireAdminRoute } from "@/lib/admin-guard";

export const Route = createFileRoute("/admin")({
  beforeLoad: () => requireAdminRoute(),
  component: AdminLayout,
});
