import { createFileRoute, Outlet } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AuthAwareShell } from "@/components/viax/auth-aware-shell";

export const Route = createFileRoute("/copa")({
  beforeLoad: async () => {
    await supabase.auth.getSession();
  },
  component: CopaLayout,
});

function CopaLayout() {
  return (
    <AuthAwareShell>
      <Outlet />
    </AuthAwareShell>
  );
}
