import { createFileRoute, Outlet } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AuthAwareShell } from "@/components/viax/auth-aware-shell";

export const Route = createFileRoute("/v")({
  beforeLoad: async () => {
    await supabase.auth.getSession();
  },
  component: VerticalLayout,
});

function VerticalLayout() {
  return (
    <AuthAwareShell>
      <Outlet />
    </AuthAwareShell>
  );
}
