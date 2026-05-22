import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseFnContext } from "@/integrations/supabase/loose";

const followingIdSchema = z.object({ followingId: z.string().uuid() });

export const toggleTraderFollowFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(followingIdSchema)
  .handler(async ({ data, context }) => {
    const { supabase } = context as unknown as SupabaseFnContext;
    const { data: following, error } = await supabase.rpc("toggle_trader_follow", {
      p_following_id: data.followingId,
    });
    if (error) throw new Error(error.message);
    return { following: following as boolean };
  });
