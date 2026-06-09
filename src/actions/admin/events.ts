import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdminAuth } from "@/integrations/supabase/admin-middleware";
import { adminRpcCall } from "@/actions/admin/_helpers";

export const adminGetEventsHubOverviewFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) =>
    adminRpcCall("bff.admin.events_hub_overview", context, (supabase) =>
      supabase.rpc("admin_get_events_hub_overview"),
    ),
  );

export const adminListPlatformEventsFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) =>
    adminRpcCall("bff.admin.platform_events", context, (supabase) =>
      supabase.rpc("admin_list_platform_events"),
    ),
  );

export const adminUpsertPlatformEventFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid().nullable().optional(),
      name: z.string(),
      slug: z.string(),
      description: z.string(),
      startsAt: z.string(),
      endsAt: z.string(),
      badgeIcon: z.string(),
      xpBoost: z.number(),
    }),
  )
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.upsert_platform_event", context, (supabase) =>
      supabase.rpc("admin_upsert_platform_event", {
        p_id: data.id ?? undefined,
        p_name: data.name,
        p_slug: data.slug,
        p_description: data.description,
        p_starts_at: data.startsAt,
        p_ends_at: data.endsAt,
        p_badge_icon: data.badgeIcon,
        p_xp_boost: data.xpBoost,
      }),
    ),
  );

export const adminDeletePlatformEventFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.delete_platform_event", context, (supabase) =>
      supabase.rpc("admin_delete_platform_event", { p_id: data.id }),
    ),
  );

export const adminListDailyPollsFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) =>
    adminRpcCall("bff.admin.daily_polls", context, (supabase) =>
      supabase.rpc("admin_list_daily_polls", { p_limit: 30 }),
    ),
  );

export const adminUpsertDailyPollFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid().nullable().optional(),
      question: z.string(),
      pollDate: z.string(),
    }),
  )
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.upsert_daily_poll", context, (supabase) =>
      supabase.rpc("admin_upsert_daily_poll", {
        p_id: data.id ?? undefined,
        p_question: data.question,
        p_poll_date: data.pollDate,
      }),
    ),
  );

export const adminDeleteDailyPollFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.delete_daily_poll", context, (supabase) =>
      supabase.rpc("admin_delete_daily_poll", { p_id: data.id }),
    ),
  );

export const adminListPartnerEventsFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .inputValidator(z.object({ partnerId: z.string().nullable().optional() }))
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.partner_events", context, (supabase) =>
      supabase.rpc("admin_list_partner_events", {
        p_limit: 50,
        p_partner_id: undefined,
        p_partner_query: data.partnerId ?? undefined,
      }),
    ),
  );

export const adminDeletePartnerEventFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator(z.object({ id: z.number().int() }))
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.delete_partner_event", context, (supabase) =>
      supabase.rpc("admin_delete_partner_event", { p_id: data.id }),
    ),
  );
