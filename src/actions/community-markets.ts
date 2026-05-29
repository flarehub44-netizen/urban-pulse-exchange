import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireRegisteredAuth } from "@/integrations/supabase/require-registered-middleware";
import type { Json } from "@/integrations/supabase/types";

async function adminRpc<T>(
  fn: () => PromiseLike<{ data: T | null; error: { message: string } | null }>,
): Promise<T> {
  const { data, error } = await fn();
  if (error) throw new Error(error.message);
  return data as T;
}

import { getSupabaseCtx } from "@/integrations/supabase/context";

const createSchema = z.object({
  question: z.string().min(10).max(280),
  endsAt: z.string().datetime(),
  visibility: z.enum(["public", "unlisted"]),
  coverUrl: z.string().url().optional(),
});

export const createCommunityMarketFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireRegisteredAuth])
  .inputValidator(createSchema)
  .handler(async ({ data, context }) => {
    const { supabase } = getSupabaseCtx(context);
    const { data: result, error } = await supabase.rpc("create_community_market", {
      p_question: data.question,
      p_ends_at: data.endsAt,
      p_visibility: data.visibility,
      p_cover_url: data.coverUrl ?? undefined,
    });
    if (error) throw new Error(error.message);
    return result as {
      market_id: string;
      visibility: string;
      access_token?: string | null;
      status: string;
    };
  });

export const joinCommunityMarketFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireRegisteredAuth])
  .inputValidator(z.object({ accessToken: z.string().min(8) }))
  .handler(async ({ data, context }) => {
    const { supabase } = getSupabaseCtx(context);
    const { data: result, error } = await supabase.rpc("join_community_market", {
      p_access_token: data.accessToken,
    });
    if (error) throw new Error(error.message);
    return result as { ok: boolean; reason?: string; market_id?: string; question?: string };
  });

const communityMarketDetailSchema = z.object({
  marketId: z.string(),
  accessToken: z.string().optional(),
});

/**
 * @public Intentionally unauthenticated — returns read-only market data for sharing/preview.
 * Rate-limited via assertRateLimit at the BFF layer.
 */
export const getCommunityMarketPublicFn = createServerFn({ method: "GET" })
  .inputValidator(communityMarketDetailSchema)
  .handler(async ({ data }) => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: result, error } = await supabase.rpc("get_community_market", {
      p_market_id: data.marketId,
      p_access_token: data.accessToken ?? undefined,
    });
    if (error) throw new Error(error.message);
    return result as {
      ok?: boolean;
      market?: Json;
      is_creator?: boolean;
      reason?: string;
    };
  });

export const getCommunityMarketFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(communityMarketDetailSchema)
  .handler(async ({ data, context }) => {
    const { supabase } = getSupabaseCtx(context);
    const { data: result, error } = await supabase.rpc("get_community_market", {
      p_market_id: data.marketId,
      p_access_token: data.accessToken ?? undefined,
    });
    if (error) throw new Error(error.message);
    return result as {
      ok?: boolean;
      market?: Json;
      is_creator?: boolean;
      reason?: string;
    };
  });

/**
 * @public Intentionally unauthenticated — lists public community markets for discovery.
 * Rate-limited via assertRateLimit at the BFF layer.
 */
export const listPublicCommunityMarketsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase.rpc("list_public_community_markets", { p_limit: 50 });
  if (error) throw new Error(error.message);
  return (data ?? []) as Json[];
});

export const listMyCommunityMarketsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = getSupabaseCtx(context);
    const { data, error } = await supabase.rpc("list_my_community_markets");
    if (error) throw new Error(error.message);
    return (data ?? []) as Json[];
  });

const resolveSchema = z.object({
  marketId: z.string(),
  winningSide: z.enum(["YES", "NO"]),
});

export const resolveCommunityMarketFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireRegisteredAuth])
  .inputValidator(resolveSchema)
  .handler(async ({ data, context }) => {
    const { supabase } = getSupabaseCtx(context);
    const { data: result, error } = await supabase.rpc("resolve_community_market", {
      p_market_id: data.marketId,
      p_winning_side: data.winningSide,
    });
    if (error) throw new Error(error.message);
    return result;
  });

export const reportCommunityMarketFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireRegisteredAuth])
  .inputValidator(z.object({ marketId: z.string(), reason: z.string().min(5).max(500) }))
  .handler(async ({ data, context }) => {
    const { supabase } = getSupabaseCtx(context);
    const { data: result, error } = await supabase.rpc("report_community_market", {
      p_market_id: data.marketId,
      p_reason: data.reason,
    });
    if (error) throw new Error(error.message);
    return result;
  });

export const voidCommunityMarketFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireRegisteredAuth])
  .inputValidator(z.object({ marketId: z.string(), reason: z.string().optional() }))
  .handler(async ({ data, context }) => {
    const { supabase } = getSupabaseCtx(context);
    const { data: result, error } = await supabase.rpc("void_community_market", {
      p_market_id: data.marketId,
      p_reason: data.reason ?? "voided_by_creator",
    });
    if (error) throw new Error(error.message);
    return result;
  });

export const getAdminCommunityMarketsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = getSupabaseCtx(context);
    return adminRpc(() => supabase.rpc("get_admin_community_markets_list"));
  });

export const getAdminCommunityReportsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = getSupabaseCtx(context);
    return adminRpc(() => supabase.rpc("get_admin_community_reports", { p_limit: 50 }));
  });

export const adminVoidCommunityMarketFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ marketId: z.string(), reason: z.string().optional() }))
  .handler(async ({ data, context }) => {
    const { supabase } = getSupabaseCtx(context);
    return adminRpc(() =>
      supabase.rpc("admin_void_community_market", {
        p_market_id: data.marketId,
        p_reason: data.reason ?? "admin_moderation",
      }),
    );
  });
