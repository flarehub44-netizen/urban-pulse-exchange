import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const createPostSchema = z.object({
  text: z.string().min(1).max(280),
  marketId: z.string().optional(),
  tag: z.enum(["Alerta", "Análise", "Previsão", "Insight"]).optional(),
});

export const createFeedPostFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(createPostSchema)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const { error } = await supabase.from("feed_posts").insert({
      user_id: userId,
      text: data.text,
      market_id: data.marketId ?? null,
      tag: data.tag ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
