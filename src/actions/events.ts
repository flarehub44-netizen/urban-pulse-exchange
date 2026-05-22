import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseFnContext } from "@/integrations/supabase/loose";

export type PlatformEvent = {
  id: string;
  name: string;
  slug: string;
  description: string;
  badge_icon: string;
  xp_boost: number;
  ends_at: string;
};

export const getActiveEventsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context as SupabaseFnContext;
    const { data, error } = await supabase.rpc("get_active_events");
    if (error) throw new Error(error.message);
    return (Array.isArray(data) ? data : []) as PlatformEvent[];
  });
