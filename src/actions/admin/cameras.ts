import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdminAuth } from "@/integrations/supabase/admin-middleware.server";
import type { Json } from "@/integrations/supabase/types";
import { adminRpcCall } from "@/actions/admin/_helpers";

export const adminListCamerasFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) =>
    adminRpcCall("bff.admin.list_cameras", context, (supabase) =>
      supabase.rpc("admin_list_cameras"),
    ),
  );

export const adminSetCameraStatusFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator(z.object({ cameraId: z.string().uuid(), status: z.string() }))
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.set_camera_status", context, (supabase) =>
      supabase.rpc("admin_set_camera_status", {
        p_camera_id: data.cameraId,
        p_status: data.status,
      }),
    ),
  );

export const adminUpsertCameraFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid().nullable().optional(),
      regionId: z.string().uuid(),
      name: z.string(),
      location: z.string().optional(),
      status: z.string().optional(),
      streamUrl: z.string().nullable().optional(),
      countLine: z.unknown().optional(),
    }),
  )
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.upsert_camera", context, (supabase) =>
      supabase.rpc("admin_upsert_camera", {
        p_id: data.id ?? undefined,
        p_region_id: data.regionId,
        p_name: data.name,
        p_location: data.location,
        p_status: data.status ?? "offline",
        p_stream_url: data.streamUrl ?? undefined,
        p_count_line: (data.countLine ?? undefined) as Json | undefined,
      }),
    ),
  );

export const adminCreateCameraUpstreamFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator(
    z.object({
      provider: z.enum(["der-sp", "cet-sp", "motiva", "custom"]),
      upstreamUrl: z.string().url(),
      label: z.string().optional(),
      kind: z.enum(["hls", "image"]).optional(),
    }),
  )
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.create_camera_upstream", context, (supabase) =>
      supabase.rpc("admin_create_camera_upstream", {
        p_provider: data.provider,
        p_upstream_url: data.upstreamUrl,
        p_label: data.label,
        p_kind: data.kind ?? "hls",
      }),
    ),
  );

export const adminSetMarketFrozenFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator(z.object({ marketId: z.string(), frozen: z.boolean() }))
  .handler(async ({ data, context }) =>
    adminRpcCall("bff.admin.set_market_frozen", context, (supabase) =>
      supabase.rpc("admin_set_market_frozen", {
        p_market_id: data.marketId,
        p_frozen: data.frozen,
      }),
    ),
  );

export const adminGetCameraHealthFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) =>
    adminRpcCall("bff.admin.camera_health", context, (supabase) =>
      supabase.rpc("get_camera_health"),
    ),
  );

export const adminGetVisionWorkerStatusFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) =>
    adminRpcCall("bff.admin.vision_worker_status", context, (supabase) =>
      supabase.rpc("get_vision_worker_status"),
    ),
  );
