import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppSidebar } from "@/components/viax/sidebar";
import { Topbar } from "@/components/viax/topbar";
import { BottomNav } from "@/components/viax/bottom-nav";
import { OnboardingModal } from "@/components/viax/onboarding-modal";
import { CommandPalette } from "@/components/viax/command-palette";
import { useRealtimeTick } from "@/hooks/use-realtime-tick";
import { useAnonAuth } from "@/hooks/use-anon-auth";
import { useSupabaseRealtime } from "@/hooks/use-supabase-realtime";
import { useResolveExpired } from "@/hooks/use-resolve-expired";
import { useClosingMarketAlerts } from "@/hooks/use-closing-market-alerts";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { authReady } = useAnonAuth();
  useRealtimeTick();
  useSupabaseRealtime();
  useResolveExpired();
  useClosingMarketAlerts();

  if (!authReady) {
    return <div className="min-h-screen w-full bg-background" />;
  }

  return (
    <div className="min-h-screen w-full bg-background">
      <div className="flex">
        <AppSidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <Topbar />
          <main className="flex-1 px-4 pb-24 pt-6 lg:px-6 lg:pb-10">
            <Outlet />
          </main>
        </div>
      </div>
      <BottomNav />
      <CommandPalette />
      <OnboardingModal />
    </div>
  );
}
