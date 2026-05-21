import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppSidebar } from "@/components/viax/sidebar";
import { Topbar } from "@/components/viax/topbar";
import { BottomNav } from "@/components/viax/bottom-nav";
import { useRealtimeTick } from "@/hooks/use-realtime-tick";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  useRealtimeTick();
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
    </div>
  );
}
