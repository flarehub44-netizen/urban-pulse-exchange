import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireAuth } from "@/lib/auth-guards";
import { AppSidebar } from "@/components/viax/sidebar";
import { Topbar } from "@/components/viax/topbar";
import { BottomNav } from "@/components/viax/bottom-nav";
import { OnboardingModal } from "@/components/viax/onboarding-modal";
import { CommandPalette } from "@/components/viax/command-palette";
import { useRealtimeTick } from "@/hooks/use-realtime-tick";
import { useSupabaseRealtime } from "@/hooks/use-supabase-realtime";
import { useResolveExpired } from "@/hooks/use-resolve-expired";
import { useClosingMarketAlerts } from "@/hooks/use-closing-market-alerts";
import { RetentionBoot } from "@/components/viax/retention-boot";
import { CasinoBoot } from "@/components/viax/casino-boot";
import { usePushDigest } from "@/hooks/use-push-digest";

export const Route = createFileRoute("/_app")({
  beforeLoad: () => requireAuth(),
  component: AppLayout,
});

function AppLayout() {
  useRealtimeTick();
  useSupabaseRealtime();
  useResolveExpired();
  useClosingMarketAlerts();
  usePushDigest();

  return (
    <div className="min-h-screen w-full bg-background">
      <RetentionBoot />
      <CasinoBoot />
      <div className="flex">
        <AppSidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <Topbar />
          <main className="app-canvas relative flex-1 px-4 pb-24 pt-6 lg:px-6 lg:pb-10">
            <div className="relative z-10">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      <BottomNav />
      <CommandPalette />
      <OnboardingModal />
    </div>
  );
}
