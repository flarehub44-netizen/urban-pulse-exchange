import { redirect } from "@tanstack/react-router";
import { db as supabase } from "@/integrations/supabase/loose";

export async function requireAdminRoute() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw redirect({ to: "/dashboard" });
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) {
    throw redirect({ to: "/dashboard" });
  }
}
