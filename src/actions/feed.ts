import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getSupabaseCtx } from "@/integrations/supabase/context";

const createPostSchema = z.object({
  text: z.string().min(1).max(280),
  marketId: z.string().optional(),
  tag: z.enum(["Alerta", "Análise", "Previsão", "Insight"]).optional(),
});

export const createFeedPostFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(createPostSchema)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = getSupabaseCtx(context);
    const { error } = await supabase.from("feed_posts").insert({
      user_id: userId,
      text: data.text,
      market_id: data.marketId ?? undefined,
      tag: data.tag ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const postIdSchema = z.object({ postId: z.string().uuid() });

const safeNum = (v: unknown): number => (typeof v === "number" ? v : 0);

export const likeFeedPostFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(postIdSchema)
  .handler(async ({ data, context }) => {
    const { data: likes, error } = await (getSupabaseCtx(context)).supabase.rpc(
      "like_feed_post",
      { p_post_id: data.postId },
    );
    if (error) throw new Error(error.message);
    return { likes: safeNum(likes) };
  });

export const repostFeedPostFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(postIdSchema)
  .handler(async ({ data, context }) => {
    const { data: reposts, error } = await (getSupabaseCtx(context)).supabase.rpc(
      "repost_feed_post",
      { p_post_id: data.postId },
    );
    if (error) throw new Error(error.message);
    return { reposts: safeNum(reposts) };
  });

const commentSchema = z.object({
  postId: z.string().uuid(),
  text: z.string().min(1).max(280),
});

export const commentFeedPostFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(commentSchema)
  .handler(async ({ data, context }) => {
    const { data: comments, error } = await (getSupabaseCtx(context)).supabase.rpc(
      "comment_feed_post",
      { p_post_id: data.postId, p_text: data.text },
    );
    if (error) throw new Error(error.message);
    return { comments: safeNum(comments) };
  });
