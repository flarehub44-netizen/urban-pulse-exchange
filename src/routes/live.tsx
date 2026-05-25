import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/viax/app-shell";
import { PublicShell } from "@/components/viax/public-shell";
import { LivePageContent } from "@/components/viax/live-page-content";
import { AppLoadingSkeleton } from "@/components/viax/app-loading-skeleton";
import { useAuthPublic } from "@/hooks/use-auth-public";

export const Route = createFileRoute("/live")({
  beforeLoad: async () => {
    await supabase.auth.getSession();
  },
  head: () => ({
    meta: [
      { title: "Mapa ao vivo · ViaX" },
      {
        name: "description",
        content: "Heatmap em tempo real do trânsito urbano e eventos ativos.",
      },
    ],
  }),
  component: LivePage,
});

function LivePage() {
  const { isRegistered, authReady } = useAuthPublic();

  if (!authReady) {
    return <AppLoadingSkeleton />;
  }

  const content = <LivePageContent refreshRegions={!isRegistered} />;

  if (isRegistered) {
    return <AppShell>{content}</AppShell>;
  }

  return <PublicShell>{content}</PublicShell>;
}
