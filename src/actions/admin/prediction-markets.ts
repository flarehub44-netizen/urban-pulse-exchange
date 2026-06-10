import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdminAuth } from "@/integrations/supabase/admin-middleware.server";
import { getSupabaseCtx } from "@/integrations/supabase/context";
import { adminRpcCall } from "@/actions/admin/_helpers";

export type AdminPredictionMarketRow = {
  id: string;
  question: string;
  vertical: string;
  status: string;
  ends_at: string;
  market_outcomes: { id: string; slug: string; label: string; pool: number }[];
};

const createPredictionMarketSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(5),
  vertical: z.enum([
    "transito",
    "esportes",
    "copa",
    "politica",
    "crypto",
    "tech",
    "cultura",
    "economia",
    "geopolitica",
    "comunidade",
  ]),
  endsAt: z.string(),
  outcomes: z.array(
    z.object({
      slug: z.string(),
      label: z.string(),
      sort_order: z.number().optional(),
    }),
  ),
  collectionSlug: z.string().optional(),
  imageUrl: z.string().optional(),
  publish: z.boolean().optional(),
});

export const adminCreatePredictionMarketFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(createPredictionMarketSchema)
  .handler(async ({ data, context }) =>
    adminRpcCall("admin.create_prediction_market", context, (supabase) =>
      supabase.rpc("admin_create_prediction_market", {
        p_id: data.id,
        p_question: data.question,
        p_vertical: data.vertical,
        p_ends_at: data.endsAt,
        p_outcomes: data.outcomes,
        p_collection_slug: data.collectionSlug ?? undefined,
        p_image_url: data.imageUrl ?? undefined,
        p_publish: data.publish ?? false,
      }),
    ),
  );

export const adminListPredictionMarketsFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) => {
    const { supabase } = getSupabaseCtx(context);
    const { data, error } = await supabase
      .from("prediction_markets")
      .select("id, question, vertical, status, ends_at, market_outcomes(id, slug, label, pool)")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as AdminPredictionMarketRow[];
  });

export const adminResolveOutcomeMarketFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(
    z.object({
      marketId: z.string(),
      winningOutcomeId: z.string().uuid(),
    }),
  )
  .handler(async ({ data, context }) =>
    adminRpcCall("admin.settle_outcome_market", context, (supabase) =>
      supabase.rpc("settle_outcome_market", {
        p_market_id: data.marketId,
        p_winning_outcome_id: data.winningOutcomeId,
      }),
    ),
  );

export const adminVoidPredictionMarketFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(
    z.object({
      marketId: z.string(),
      reason: z.string().optional(),
    }),
  )
  .handler(async ({ data, context }) =>
    adminRpcCall("admin.void_prediction_market", context, (supabase) =>
      supabase.rpc("admin_void_prediction_market", {
        p_market_id: data.marketId,
        p_reason: data.reason ?? "admin_void",
      }),
    ),
  );

const updateOutcomeSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().optional(),
  label: z.string(),
});

export const adminUpdatePredictionMarketFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(
    z.object({
      marketId: z.string(),
      question: z.string().optional(),
      endsAt: z.string().optional(),
      outcomes: z.array(updateOutcomeSchema).optional(),
    }),
  )
  .handler(async ({ data, context }) =>
    adminRpcCall("admin.update_prediction_market", context, (supabase) =>
      supabase.rpc("admin_update_prediction_market", {
        p_market_id: data.marketId,
        p_question: data.question ?? undefined,
        p_ends_at: data.endsAt ?? undefined,
        p_outcomes: data.outcomes ?? undefined,
      }),
    ),
  );
