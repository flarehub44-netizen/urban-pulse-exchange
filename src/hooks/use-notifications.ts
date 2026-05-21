import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ViaXNotification } from "@/store/viax-store";

function mapNotification(row: Record<string, unknown>): ViaXNotification {
  return {
    id: row.id as string,
    kind: row.kind as ViaXNotification["kind"],
    text: row.text as string,
    time: new Date(row.created_at as string).getTime(),
    read: row.read as boolean,
  };
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []).map(mapNotification);
    },
    staleTime: 30_000,
  });
}

export { mapNotification };
