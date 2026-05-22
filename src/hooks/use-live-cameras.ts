import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LiveCamera = {
  id: string;
  name: string;
  region_id: string | null;
  location: string | null;
  stream_url: string;
  detection_ok: boolean;
};

export type RegionCameraStatus = {
  region_id: string;
  online_count: number;
  detecting_count: number;
  last_reading_at: string | null;
  last_flow_estimate: number | null;
};

export function useLiveCameras(regionId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: ["cameras", "live", regionId ?? "all"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_live_cameras", {
        p_region_id: regionId ?? null,
      });
      if (error) throw error;
      return (data ?? []) as LiveCamera[];
    },
    enabled: enabled && !!regionId,
    refetchInterval: 30_000,
  });
}

export function useRegionCameraStatus(regionId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: ["cameras", "status", regionId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_region_camera_status", {
        p_region_id: regionId!,
      });
      if (error) throw error;
      return data as RegionCameraStatus;
    },
    enabled: enabled && !!regionId,
    refetchInterval: 30_000,
  });
}
