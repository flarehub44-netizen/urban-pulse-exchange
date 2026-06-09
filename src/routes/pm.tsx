import { createFileRoute, Outlet } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AuthAwareShell } from "@/components/viax/auth-aware-shell";

export const Route = createFileRoute("/pm")({
  beforeLoad: async () => {
    await supabase.auth.getSession();
  },
  component: PmLayout,
});

function PmLayout() {
  return (
    <AuthAwareShell>
      <Outlet />
    </AuthAwareShell>
  );
}
