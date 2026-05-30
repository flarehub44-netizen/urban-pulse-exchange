import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware.server";
import { getSupabaseCtx } from "@/integrations/supabase/context";

const followingIdSchema = z.object({ followingId: z.string().uuid() });

export const toggleTraderFollowFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(followingIdSchema)
  .handler(async ({ data, context }) => {
    const { supabase } = getSupabaseCtx(context);
    const { data: following, error } = await supabase.rpc("toggle_trader_follow", {
      p_following_id: data.followingId,
    });
    if (error) throw new Error(error.message);
    return { following: following as boolean };
  });
