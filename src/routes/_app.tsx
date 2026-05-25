import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireAuth } from "@/lib/auth-guards";
import { AppShell } from "@/components/viax/app-shell";

export const Route = createFileRoute("/_app")({
  beforeLoad: () => requireAuth(),
  component: AppLayout,
});

function AppLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
