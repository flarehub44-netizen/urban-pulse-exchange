import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdminAuth } from "@/integrations/supabase/admin-middleware";
import type { Json } from "@/integrations/supabase/types";
import { adminRpcCall } from "@/actions/admin/_helpers";

export const adminListTrafficTemplatesFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) =>
    adminRpcCall("bff.admin.traffic_templates", context, (supabase) =>
      supabase.rpc("admin_list_traffic_templates"),
    ),
  );

export const adminUpsertTrafficTemplateFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator(z.object({ payload: z.record(z.unknown()) }))
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.upsert_traffic_template", context, (supabase) =>
      supabase.rpc("admin_upsert_traffic_template", {
        p_payload: data.payload as Json,
      }),
    ),
  );

export const adminTestTrafficTemplateFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator(z.object({ templateId: z.string().uuid() }))
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.test_traffic_template", context, (supabase) =>
      supabase.rpc("admin_test_traffic_template", { p_template_id: data.templateId }),
    ),
  );

export const adminSetTrafficTemplateReadyFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator(z.object({ templateId: z.string().uuid(), ready: z.boolean() }))
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.set_traffic_template_ready", context, (supabase) =>
      supabase.rpc("admin_set_traffic_template_ready", {
        p_template_id: data.templateId,
        p_ready: data.ready,
      }),
    ),
  );

export const adminUpdateTrafficSchedulerFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator(z.object({ payload: z.record(z.unknown()) }))
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.update_traffic_scheduler", context, (supabase) =>
      supabase.rpc("admin_update_traffic_scheduler", {
        p_payload: data.payload as Json,
      }),
    ),
  );

export const adminDeleteTrafficTemplateFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator(z.object({ templateId: z.string().uuid() }))
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.delete_traffic_template", context, (supabase) =>
      supabase.rpc("admin_delete_traffic_template", { p_template_id: data.templateId }),
    ),
  );

export const adminGetTrafficSchedulerFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) => {
    const { supabase } = (await import("@/integrations/supabase/context")).getSupabaseCtx(
      context,
    );
    const { data, error } = await supabase
      .from("traffic_scheduler")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });
