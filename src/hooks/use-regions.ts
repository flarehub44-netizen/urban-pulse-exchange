import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { RegionData } from "@/store/viax-store";

function mapRegion(row: Record<string, unknown>): RegionData {
  return {
    id: row.id as string,
    name: row.name as string,
    congestion: Number(row.congestion),
    flow: Number(row.flow),
    avgSpeed: Number(row.avg_speed),
    x: Number(row.x),
    y: Number(row.y),
    r: Number(row.r),
  };
}

export function useRegions() {
  return useQuery({
    queryKey: ["regions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("regions").select("*");
      if (error) throw error;
      return (data ?? []).map(mapRegion);
    },
    staleTime: 10_000,
  });
}
