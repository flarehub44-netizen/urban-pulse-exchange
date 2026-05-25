import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AuthAwareShell } from "@/components/viax/auth-aware-shell";
import { LivePageContent } from "@/components/viax/live-page-content";
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
  return (
    <AuthAwareShell>
      <LivePageContent refreshRegions={authReady && !isRegistered} />
    </AuthAwareShell>
  );
}
