import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminCreateCameraUpstreamFn,
  adminListCamerasFn,
  adminSetCameraStatusFn,
  adminUpsertCameraFn,
} from "@/actions/admin/cameras";

export type AdminCamera = {
  id: string;
  region_id: string | null;
  name: string;
  location: string | null;
  status: string;
  stream_url: string | null;
  fps: number | null;
  detection_ok: boolean;
  count_line: unknown;
  last_vehicle_count?: number | null;
  last_flow_estimate?: number | null;
  last_metric_at?: string | null;
};

export type CameraHealthRow = {
  id: string;
  name: string;
  region_id: string | null;
  status: string;
  detection_ok: boolean;
  stream_host: string | null;
  last_metric_at: string | null;
  minutes_stale: number | null;
  is_stale: boolean;
};

export function useAdminCameras(enabled = true) {
  return useQuery({
    queryKey: ["admin", "cameras"],
    queryFn: () => adminListCamerasFn() as Promise<AdminCamera[]>,
    enabled,
  });
}

export function useAdminSetCameraStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cameraId, status }: { cameraId: string; status: string }) =>
      adminSetCameraStatusFn({ data: { cameraId, status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "cameras"] }),
  });
}

export function useAdminUpsertCamera() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      p_id: string | null;
      p_region_id: string;
      p_name: string;
      p_location?: string;
      p_status?: string;
      p_stream_url?: string | null;
      p_count_line?: unknown;
    }) =>
      adminUpsertCameraFn({
        data: {
          id: args.p_id,
          regionId: args.p_region_id,
          name: args.p_name,
          location: args.p_location,
          status: args.p_status,
          streamUrl: args.p_stream_url,
          countLine: args.p_count_line,
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "cameras"] }),
  });
}

export function useAdminCreateCameraUpstream() {
  return useMutation({
    mutationFn: (args: {
      provider: "der-sp" | "cet-sp" | "motiva" | "custom";
      upstreamUrl: string;
      label?: string;
      kind?: "hls" | "image";
    }) =>
      adminCreateCameraUpstreamFn({
        data: {
          provider: args.provider,
          upstreamUrl: args.upstreamUrl,
          label: args.label,
          kind: args.kind,
        },
      }) as Promise<{ slug: string; proxy_path: string }>,
  });
}
