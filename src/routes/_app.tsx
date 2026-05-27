import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireRegistered } from "@/lib/auth-guards";
import { AppShell } from "@/components/viax/app-shell";
import { RouteErrorBoundary } from "@/components/viax/route-error-boundary";
import { AppLoadingSkeleton } from "@/components/viax/app-loading-skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";

export const Route = createFileRoute("/_app")({
  beforeLoad: () => requireRegistered(),
  component: AppLayout,
});

function AppLayout() {
  const { authReady, userId } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile(userId);

  if (!authReady || !userId || profileLoading || !profile) {
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
