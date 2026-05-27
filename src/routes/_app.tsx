import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireRegistered } from "@/lib/auth-guards";
import { AppShell } from "@/components/viax/app-shell";
import { RouteErrorBoundary } from "@/components/viax/route-error-boundary";
import { AppLoadingSkeleton } from "@/components/viax/app-loading-skeleton";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_app")({
  beforeLoad: () => requireRegistered(),
  component: AppLayout,
});

function AppLayout() {
  const { authReady } = useAuth();

  if (!authReady) {
    return <AppLoadingSkeleton />;
  }

  return (
    <AppShell>
      <RouteErrorBoundary>
        <Outlet />
      </RouteErrorBoundary>
    </AppShell>
  );
}
