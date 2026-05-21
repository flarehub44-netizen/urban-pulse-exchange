import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const followingIdSchema = z.object({ followingId: z.string().uuid() });

export const toggleTraderFollowFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(followingIdSchema)
  .handler(
    async ({
      data,
      context,
    }: {
      data: { followingId: string };
      context: {
        supabase: {
          rpc: (
            fn: string,
            args: object,
          ) => Promise<{ data: unknown; error: { message: string } | null }>;
        };
      };
    }) => {
      const { data: following, error } = await context.supabase.rpc("toggle_trader_follow", {
        p_following_id: data.followingId,
      });
      if (error) throw new Error(error.message);
      return { following: following as boolean };
    },
  );
