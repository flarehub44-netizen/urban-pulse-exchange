import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type PlatformEvent = {
  id: string;
  name: string;
  slug: string;
  description: string;
  badge_icon: string;
  xp_boost: number;
  ends_at: string;
};

export const getActiveEventsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin.rpc("get_active_events");
  if (error) throw new Error(error.message);
  return (Array.isArray(data) ? data : []) as PlatformEvent[];
});
