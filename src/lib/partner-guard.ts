import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export async function requirePartnerRoute() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw redirect({ to: "/dashboard" });

  const { data, error } = await supabase.rpc("get_my_partner_status");
  if (error) throw redirect({ to: "/settings" });

  const status = data as { role?: string; status?: string };
  if (status?.role !== "partner" || status?.status !== "active") {
    throw redirect({ to: "/profile", search: { tab: "config" } });
  }
}
