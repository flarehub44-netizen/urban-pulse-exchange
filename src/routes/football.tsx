import { createFileRoute, Outlet } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AuthAwareShell } from "@/components/viax/auth-aware-shell";

export const Route = createFileRoute("/football")({
  beforeLoad: async () => {
    await supabase.auth.getSession();
  },
  component: FootballLayout,
});

function FootballLayout() {
  return (
    <AuthAwareShell>
      <Outlet />
    </AuthAwareShell>
  );
}
